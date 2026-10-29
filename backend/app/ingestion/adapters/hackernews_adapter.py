import asyncio
from datetime import datetime
from typing import List, Dict, Any
from app.ingestion.base import SourceAdapter, RawOpportunity
from app.ingestion.http_client import http_client
from app.models.opportunity import OpportunityType
from app.core.logging import logger


class HackerNewsAdapter(SourceAdapter):
    """
    Hacker News official API adapter.
    Scans the official 'whoishiring' user submissions for monthly 'Who is hiring?'
    and 'Freelancer? Seeking freelancer?' threads, then parses top comments.
    """
    name: str = "hackernews"
    type: str = "api"
    required_env: List[str] = []

    HN_BASE = "https://hacker-news.firebaseio.com/v0"

    async def fetch(self) -> List[RawOpportunity]:
        logger.info("[HackerNewsAdapter] Querying whoishiring submissions...")
        try:
            # 1. Fetch submitted items from user 'whoishiring'
            user_resp = await http_client.get(f"{self.HN_BASE}/user/whoishiring.json", use_cache=True)
            submitted = user_resp.json().get("submitted", [])[:8]

            opportunities: List[RawOpportunity] = []

            for item_id in submitted[:3]:
                item_resp = await http_client.get(f"{self.HN_BASE}/item/{item_id}.json", use_cache=True)
                item = item_resp.json()
                if not item or item.get("type") != "story":
                    continue

                thread_title = item.get("title", "")
                is_freelance = "freelancer" in thread_title.lower()
                opp_type = OpportunityType.FREELANCE if is_freelance else OpportunityType.JOB

                kids = item.get("kids", [])[:15]  # Top 15 postings in the monthly thread

                # Fetch child comments
                for kid_id in kids:
                    try:
                        c_resp = await http_client.get(f"{self.HN_BASE}/item/{kid_id}.json", use_cache=True)
                        comment = c_resp.json()
                        if not comment or comment.get("deleted") or not comment.get("text"):
                            continue

                        raw_text = comment.get("text", "")
                        # Split first line for title/company
                        lines = [l.strip() for l in raw_text.split("<p>") if l.strip()]
                        headline = lines[0] if lines else "Hacker News Opportunity"
                        org_name = "YC / HN Community"
                        if "|" in headline:
                            parts = headline.split("|")
                            org_name = parts[0].strip()

                        posted_at = None
                        if comment.get("time"):
                            posted_at = datetime.fromtimestamp(comment["time"])

                        opportunities.append(
                            RawOpportunity(
                                external_id=f"hn-comment-{kid_id}",
                                title=headline[:200],
                                org=org_name[:100],
                                url=f"https://news.ycombinator.com/item?id={kid_id}",
                                description=raw_text[:3000],
                                type=opp_type,
                                skills=[],
                                location="Remote / Hybrid" if "remote" in raw_text.lower() else "See Posting",
                                remote="remote" in raw_text.lower(),
                                posted_at=posted_at,
                                raw_data={"source": "hackernews", "thread_id": item_id, "id": kid_id},
                            )
                        )
                    except Exception as ce:
                        logger.debug(f"[HackerNewsAdapter] Error fetching comment {kid_id}: {ce}")

            logger.info(f"[HackerNewsAdapter] Successfully parsed {len(opportunities)} postings from HN threads")
            return opportunities
        except Exception as e:
            logger.error(f"[HackerNewsAdapter] Error fetching Hacker News items: {e}")
            raise
