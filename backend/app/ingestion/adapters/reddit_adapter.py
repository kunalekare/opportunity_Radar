import os
from datetime import datetime
from typing import List, Dict, Any
from app.ingestion.base import SourceAdapter, RawOpportunity
from app.ingestion.http_client import http_client
from app.models.opportunity import OpportunityType
from app.core.config import settings
from app.core.logging import logger


class RedditAdapter(SourceAdapter):
    """
    Reddit API adapter for subreddits like r/forhire, r/internships, r/freelance.
    Can run with public JSON endpoint using unique User-Agent or via OAuth.
    """
    name: str = "reddit"
    type: str = "api"
    required_env: List[str] = ["REDDIT_CLIENT_ID", "REDDIT_CLIENT_SECRET"]

    async def fetch(self) -> List[RawOpportunity]:
        subreddits = self.config.get("subreddits", ["forhire", "internships"])
        opportunities: List[RawOpportunity] = []

        headers = {
            "User-Agent": settings.REDDIT_USER_AGENT,
        }

        for sub in subreddits:
            url = f"https://www.reddit.com/r/{sub}/new.json?limit=25"
            try:
                logger.info(f"[RedditAdapter] Fetching r/{sub}/new")
                resp = await http_client.get(url, headers=headers, use_cache=True)
                data = resp.json()
                children = data.get("data", {}).get("children", [])

                for item in children:
                    post = item.get("data", {})
                    ext_id = str(post.get("id"))
                    title = post.get("title", "")
                    selftext = post.get("selftext", "")
                    permalink = post.get("permalink", "")
                    author = post.get("author", "Reddit User")
                    created_utc = post.get("created_utc")

                    # In r/forhire, filter only [Hiring] posts, ignore [For Hire]
                    if sub == "forhire" and "[hiring]" not in title.lower():
                        continue

                    posted_at = None
                    if created_utc:
                        posted_at = datetime.fromtimestamp(created_utc)

                    opp_type = OpportunityType.FREELANCE if sub == "forhire" else (
                        OpportunityType.INTERNSHIP if sub == "internships" else OpportunityType.JOB
                    )

                    opportunities.append(
                        RawOpportunity(
                            external_id=f"reddit-{sub}-{ext_id}",
                            title=title,
                            org=f"u/{author} (r/{sub})",
                            url=f"https://www.reddit.com{permalink}",
                            description=selftext or title,
                            type=opp_type,
                            skills=[],
                            location="Remote" if "remote" in title.lower() or "remote" in selftext.lower() else "See Post",
                            remote="remote" in title.lower() or "remote" in selftext.lower(),
                            posted_at=posted_at,
                            raw_data={"source": "reddit", "subreddit": sub, "id": ext_id},
                        )
                    )
            except Exception as e:
                logger.warning(f"[RedditAdapter] Failed fetching r/{sub}: {e}")

        logger.info(f"[RedditAdapter] Successfully fetched {len(opportunities)} Reddit listings")
        return opportunities
