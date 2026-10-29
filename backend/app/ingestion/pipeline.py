from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.source import Source
from app.models.opportunity import Opportunity, OpportunityType
from app.models.ingestion_run import IngestionRun
from app.ingestion.base import OpportunityCreate, RawOpportunity
from app.ingestion.registry import create_adapter
from app.ingestion.normalizer import claude_normalizer
from app.ingestion.deduplication import (
    clean_url,
    compute_content_hash,
    compute_text_similarity,
    is_expired,
    calculate_richness_score,
)
from app.ingestion.embeddings import get_embedding_provider
from app.core.logging import logger


class IngestionPipeline:
    def __init__(self, db: Session):
        self.db = db
        self.embedding_provider = get_embedding_provider()

    async def run_source(self, source: Source) -> IngestionRun:
        """
        Executes a complete ingestion run for a single source:
        Fetch -> Normalize -> Deduplicate -> Expire -> Embed -> Persist.
        Isolates errors so failures never propagate to other sources.
        """
        run = IngestionRun(
            source_id=source.id,
            status="running",
            started_at=datetime.utcnow(),
            fetched=0,
            new=0,
            duplicates=0,
            errors=[],
            tokens_used=0,
        )
        self.db.add(run)
        self.db.commit()
        self.db.refresh(run)

        adapter = create_adapter(source)
        if not adapter:
            run.status = "failed"
            run.finished_at = datetime.utcnow()
            run.errors = [f"No adapter implementation found for source '{source.name}'"]
            source.last_error = run.errors[0]
            self.db.commit()
            return run

        # Verify environment configuration
        is_ready, missing_keys = adapter.is_configured()
        if not is_ready:
            msg = f"Needs configuration: missing required environment keys {missing_keys}"
            logger.info(f"[IngestionPipeline] Source '{source.name}': {msg}")
            run.status = "partial"
            run.finished_at = datetime.utcnow()
            run.errors = [msg]
            source.last_error = msg
            self.db.commit()
            return run

        try:
            # 1. Fetch raw listings
            raw_items = await adapter.fetch()
            run.fetched = len(raw_items)
            logger.info(f"[IngestionPipeline] Source '{source.name}' fetched {len(raw_items)} items")

            if not raw_items:
                run.status = "success"
                run.finished_at = datetime.utcnow()
                source.last_run_at = datetime.utcnow()
                source.last_error = None
                self.db.commit()
                return run

            # 2. Basic deterministic normalization
            normalized_items: List[OpportunityCreate] = []
            for raw in raw_items:
                cleaned_link = clean_url(raw.url)
                norm = adapter.normalize(raw, source.id)
                norm.url = cleaned_link
                norm.content_hash = compute_content_hash(norm.title, norm.org, cleaned_link)
                normalized_items.append(norm)

            # 3. Filter Level 1 & Level 2 duplicates and expired items
            valid_candidates: List[OpportunityCreate] = []
            duplicate_count = 0

            # Preload existing external_ids and hashes for this source
            existing_ext_ids = set(
                row[0] for row in self.db.query(Opportunity.external_id).filter(
                    Opportunity.source_id == source.id
                ).all()
            )
            existing_hashes = set(
                row[0] for row in self.db.query(Opportunity.content_hash).all()
            )

            for item in normalized_items:
                # Level 1 check
                if item.external_id in existing_ext_ids:
                    duplicate_count += 1
                    continue

                # Level 2 check
                if item.content_hash in existing_hashes:
                    duplicate_count += 1
                    continue

                # Expiry check
                if is_expired(item):
                    continue

                valid_candidates.append(item)
                existing_ext_ids.add(item.external_id)
                existing_hashes.add(item.content_hash)

            run.duplicates = duplicate_count

            if not valid_candidates:
                run.status = "success"
                run.finished_at = datetime.utcnow()
                source.last_run_at = datetime.utcnow()
                source.last_error = None
                self.db.commit()
                return run

            # 4. Normalization with Claude for incomplete items
            enriched_items, tokens = await claude_normalizer.normalize_batch(valid_candidates)
            run.tokens_used = tokens

            # 5. Level 3 Near-duplicate matching against existing active opportunities
            active_opps = self.db.query(Opportunity.id, Opportunity.title, Opportunity.org).filter(
                Opportunity.status == "active"
            ).order_by(Opportunity.created_at.desc()).limit(150).all()

            new_persisted_count = 0

            for cand in enriched_items:
                duplicate_of_id = None
                is_near_dup = False

                for act_id, act_title, act_org in active_opps:
                    score = compute_text_similarity(
                        f"{cand.title} {cand.org}",
                        f"{act_title} {act_org}"
                    )
                    if score >= 88.0:
                        is_near_dup = True
                        duplicate_of_id = act_id
                        break

                # Generate vector embedding for opportunity
                embed_text = f"{cand.title}\n{cand.org}\n{cand.description[:1000]}\n{' '.join(cand.skills)}"
                embedding_vector = await self.embedding_provider.generate_embedding(embed_text)

                opp_entity = Opportunity(
                    source_id=cand.source_id,
                    external_id=cand.external_id,
                    type=cand.type,
                    title=cand.title,
                    org=cand.org,
                    description=cand.description,
                    skills=cand.skills,
                    location=cand.location,
                    remote=cand.remote,
                    pay_min=cand.pay_min,
                    pay_max=cand.pay_max,
                    currency=cand.currency,
                    deadline=cand.deadline,
                    posted_at=cand.posted_at,
                    url=cand.url,
                    raw=cand.raw,
                    content_hash=cand.content_hash or "",
                    duplicate_of_id=duplicate_of_id,
                    status="duplicate" if is_near_dup else "active",
                    embedding=embedding_vector,
                )
                self.db.add(opp_entity)
                if not is_near_dup:
                    new_persisted_count += 1
                else:
                    run.duplicates += 1

            self.db.commit()

            run.new = new_persisted_count
            run.status = "success"
            run.finished_at = datetime.utcnow()
            source.last_run_at = datetime.utcnow()
            source.last_error = None
            self.db.commit()
            logger.info(
                f"[IngestionPipeline] Finished source '{source.name}': {new_persisted_count} new, {run.duplicates} dups, {tokens} tokens."
            )
            return run

        except Exception as e:
            logger.error(f"[IngestionPipeline] Error executing source '{source.name}': {e}", exc_info=True)
            self.db.rollback()
            run.status = "failed"
            run.finished_at = datetime.utcnow()
            run.errors = [str(e)]
            source.last_error = str(e)
            self.db.commit()
            return run

    async def run_all_enabled(self) -> List[IngestionRun]:
        """Runs all enabled sources sequentially with error isolation."""
        sources = self.db.query(Source).filter(Source.enabled == True).all()
        runs = []
        for src in sources:
            r = await self.run_source(src)
            runs.append(r)
        return runs
