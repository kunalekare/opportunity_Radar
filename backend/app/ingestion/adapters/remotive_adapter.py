from datetime import datetime
from typing import List, Dict, Any
from app.ingestion.base import SourceAdapter, RawOpportunity
from app.ingestion.http_client import http_client
from app.models.opportunity import OpportunityType
from app.core.logging import logger


class RemotiveAdapter(SourceAdapter):
    """
    Fetches verified remote jobs from the official Remotive public API.
    Endpoint: https://remotive.com/api/remote-jobs
    No auth required. Rate limit respected.
    """
    name: str = "remotive"
    type: str = "api"
    required_env: List[str] = []

    async def fetch(self) -> List[RawOpportunity]:
        url = self.config.get("api_url", "https://remotive.com/api/remote-jobs?limit=30")
        logger.info(f"[RemotiveAdapter] Fetching remote jobs from {url}")

        try:
            resp = await http_client.get(url, use_cache=True)
            data = resp.json()
            jobs = data.get("jobs", [])
            opportunities: List[RawOpportunity] = []

            for job in jobs:
                ext_id = str(job.get("id"))
                title = job.get("title", "")
                org = job.get("company_name", "Remote Company")
                job_url = job.get("url", "")
                description = job.get("description", "")
                category = job.get("category", "")
                tags = job.get("tags", [])
                location = job.get("candidate_required_location", "Remote")
                salary = job.get("salary", "")
                publication_date = job.get("publication_date")

                # Parse salary range if present
                pay_min, pay_max = None, None
                if salary:
                    import re
                    numbers = re.findall(r'\b\d{2,6}\b', salary.replace(",", ""))
                    if len(numbers) >= 2:
                        pay_min, pay_max = float(numbers[0]), float(numbers[1])
                    elif len(numbers) == 1:
                        pay_min = float(numbers[0])

                posted_at = None
                if publication_date:
                    try:
                        posted_at = datetime.fromisoformat(publication_date.replace("Z", "+00:00"))
                    except Exception:
                        pass

                opportunities.append(
                    RawOpportunity(
                        external_id=f"remotive-{ext_id}",
                        title=title,
                        org=org,
                        url=job_url,
                        description=description,
                        type=OpportunityType.JOB,
                        skills=tags if tags else ([category] if category else []),
                        location=location,
                        remote=True,
                        pay_min=pay_min,
                        pay_max=pay_max,
                        currency="USD",
                        posted_at=posted_at,
                        raw_data={"source": "remotive", "id": ext_id, "salary": salary},
                    )
                )

            logger.info(f"[RemotiveAdapter] Successfully fetched {len(opportunities)} opportunities")
            return opportunities
        except Exception as e:
            logger.error(f"[RemotiveAdapter] Failed fetching Remotive jobs: {e}")
            raise
