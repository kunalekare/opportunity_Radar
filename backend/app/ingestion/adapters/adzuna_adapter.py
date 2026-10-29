import os
from datetime import datetime
from typing import List, Dict, Any
from app.ingestion.base import SourceAdapter, RawOpportunity
from app.ingestion.http_client import http_client
from app.models.opportunity import OpportunityType
from app.core.config import settings
from app.core.logging import logger


class AdzunaAdapter(SourceAdapter):
    """
    Adzuna Jobs & Internships API.
    Supports country code via config or env (default 'in' for India, 'us', 'gb').
    Requires ADZUNA_APP_ID and ADZUNA_APP_KEY.
    """
    name: str = "adzuna"
    type: str = "api"
    required_env: List[str] = ["ADZUNA_APP_ID", "ADZUNA_APP_KEY"]

    async def fetch(self) -> List[RawOpportunity]:
        app_id = os.getenv("ADZUNA_APP_ID") or settings.ADZUNA_APP_ID
        app_key = os.getenv("ADZUNA_APP_KEY") or settings.ADZUNA_APP_KEY

        if not app_id or not app_key:
            logger.info("[AdzunaAdapter] Missing ADZUNA_APP_ID or ADZUNA_APP_KEY; skipping run.")
            return []

        country = self.config.get("country", settings.ADZUNA_COUNTRY or "in").lower()
        search_query = self.config.get("query", "software intern python react")
        url = f"https://api.adzuna.com/v1/api/jobs/{country}/search/1"

        params = {
            "app_id": app_id,
            "app_key": app_key,
            "what": search_query,
            "results_per_page": 20,
            "content-type": "application/json",
        }

        try:
            logger.info(f"[AdzunaAdapter] Querying Adzuna {country.upper()} for: {search_query}")
            resp = await http_client.get(url, params=params, use_cache=True)
            data = resp.json()
            results = data.get("results", [])
            opportunities: List[RawOpportunity] = []

            for job in results:
                ext_id = str(job.get("id"))
                title = job.get("title", "")
                org = job.get("company", {}).get("display_name", "Adzuna Employer")
                job_url = job.get("redirect_url", "")
                description = job.get("description", "")
                location = job.get("location", {}).get("display_name", "India / Global")
                salary_min = job.get("salary_min")
                salary_max = job.get("salary_max")
                created_str = job.get("created")

                posted_at = None
                if created_str:
                    try:
                        posted_at = datetime.fromisoformat(created_str.replace("Z", "+00:00"))
                    except Exception:
                        pass

                opp_type = OpportunityType.JOB
                if "intern" in title.lower() or "internship" in title.lower():
                    opp_type = OpportunityType.INTERNSHIP

                opportunities.append(
                    RawOpportunity(
                        external_id=f"adzuna-{country}-{ext_id}",
                        title=title,
                        org=org,
                        url=job_url,
                        description=description,
                        type=opp_type,
                        skills=[],
                        location=location,
                        remote="remote" in location.lower() or "remote" in title.lower(),
                        pay_min=float(salary_min) if salary_min else None,
                        pay_max=float(salary_max) if salary_max else None,
                        currency="INR" if country == "in" else "USD",
                        posted_at=posted_at,
                        raw_data={"source": "adzuna", "country": country, "id": ext_id},
                    )
                )

            logger.info(f"[AdzunaAdapter] Successfully fetched {len(opportunities)} listings")
            return opportunities
        except Exception as e:
            logger.error(f"[AdzunaAdapter] Failed fetching Adzuna listings: {e}")
            raise
