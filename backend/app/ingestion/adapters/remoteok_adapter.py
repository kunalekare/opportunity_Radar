from datetime import datetime
from typing import List, Dict, Any
from app.ingestion.base import SourceAdapter, RawOpportunity
from app.ingestion.http_client import http_client
from app.models.opportunity import OpportunityType
from app.core.logging import logger


class RemoteOKAdapter(SourceAdapter):
    """
    Fetches remote jobs from the official RemoteOK API.
    Endpoint: https://remoteok.com/api
    The first element in the returned array is API metadata; postings start at index 1.
    """
    name: str = "remoteok"
    type: str = "api"
    required_env: List[str] = []

    async def fetch(self) -> List[RawOpportunity]:
        url = self.config.get("api_url", "https://remoteok.com/api")
        logger.info(f"[RemoteOKAdapter] Fetching remote jobs from {url}")

        try:
            resp = await http_client.get(url, use_cache=True)
            data = resp.json()
            if not isinstance(data, list):
                logger.warning("[RemoteOKAdapter] Unexpected response shape; expected list.")
                return []

            opportunities: List[RawOpportunity] = []
            # Index 0 is legal / metadata disclaimer
            postings = data[1:]

            for job in postings[:40]:
                if not isinstance(job, dict):
                    continue
                ext_id = str(job.get("id"))
                title = job.get("position", "")
                org = job.get("company", "Remote Org")
                job_url = job.get("url", "")
                if not job_url and ext_id:
                    job_url = f"https://remoteok.com/remote-jobs/{ext_id}"
                description = job.get("description", "")
                tags = job.get("tags", [])
                location = job.get("location", "Remote")
                salary_min = job.get("salary_min")
                salary_max = job.get("salary_max")
                date_str = job.get("date")

                posted_at = None
                if date_str:
                    try:
                        posted_at = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
                    except Exception:
                        pass

                opportunities.append(
                    RawOpportunity(
                        external_id=f"remoteok-{ext_id}",
                        title=title,
                        org=org,
                        url=job_url,
                        description=description,
                        type=OpportunityType.JOB,
                        skills=[t for t in tags if isinstance(t, str)],
                        location=location or "Remote",
                        remote=True,
                        pay_min=float(salary_min) if salary_min else None,
                        pay_max=float(salary_max) if salary_max else None,
                        currency="USD",
                        posted_at=posted_at,
                        raw_data={"source": "remoteok", "id": ext_id},
                    )
                )

            logger.info(f"[RemoteOKAdapter] Successfully fetched {len(opportunities)} opportunities")
            return opportunities
        except Exception as e:
            logger.error(f"[RemoteOKAdapter] Failed fetching RemoteOK jobs: {e}")
            raise
