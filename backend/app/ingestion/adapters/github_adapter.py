import os
from datetime import datetime
from typing import List, Dict, Any
from app.ingestion.base import SourceAdapter, RawOpportunity
from app.ingestion.http_client import http_client
from app.models.opportunity import OpportunityType
from app.core.config import settings
from app.core.logging import logger


class GitHubAdapter(SourceAdapter):
    """
    Finds open source collaboration opportunities, mentorship, and bounty issues.
    Searches issues with labels 'good first issue' or 'help wanted' matching developer skills.
    Requires GITHUB_TOKEN for high rate limit (can operate with lower limits unauthenticated).
    """
    name: str = "github"
    type: str = "api"
    required_env: List[str] = ["GITHUB_TOKEN"]

    async def fetch(self) -> List[RawOpportunity]:
        token = os.getenv("GITHUB_TOKEN") or settings.GITHUB_TOKEN
        headers = {
            "Accept": "application/vnd.github.v3+json",
        }
        if token:
            headers["Authorization"] = f"token {token}"
        else:
            logger.info("[GitHubAdapter] GITHUB_TOKEN not configured; running with public rate limits.")

        query = self.config.get("query", 'label:"good first issue" state:open language:python language:typescript')
        url = f"https://api.github.com/search/issues?q={query}&sort=updated&order=desc&per_page=20"

        try:
            logger.info(f"[GitHubAdapter] Querying GitHub issues: {query}")
            resp = await http_client.get(url, headers=headers, use_cache=True)
            data = resp.json()
            items = data.get("items", [])
            opportunities: List[RawOpportunity] = []

            for item in items:
                ext_id = str(item.get("id"))
                title = item.get("title", "")
                issue_url = item.get("html_url", "")
                body = item.get("body", "") or "No description provided."
                repo_url = item.get("repository_url", "")
                repo_name = repo_url.split("/")[-1] if repo_url else "Open Source Project"
                org_name = repo_url.split("/")[-2] if repo_url and len(repo_url.split("/")) >= 2 else "GitHub"

                labels = [l.get("name") for l in item.get("labels", []) if isinstance(l, dict)]
                created_at_str = item.get("created_at")
                posted_at = None
                if created_at_str:
                    try:
                        posted_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
                    except Exception:
                        pass

                opportunities.append(
                    RawOpportunity(
                        external_id=f"github-issue-{ext_id}",
                        title=f"{org_name}/{repo_name}: {title}",
                        org=f"{org_name} (GitHub OSS)",
                        url=issue_url,
                        description=body[:3000],
                        type=OpportunityType.COLLABORATION,
                        skills=labels,
                        location="Remote / Worldwide",
                        remote=True,
                        posted_at=posted_at,
                        raw_data={"source": "github", "id": ext_id, "repo": f"{org_name}/{repo_name}"},
                    )
                )

            logger.info(f"[GitHubAdapter] Successfully fetched {len(opportunities)} collaboration issues")
            return opportunities
        except Exception as e:
            logger.error(f"[GitHubAdapter] Failed fetching GitHub issues: {e}")
            raise
