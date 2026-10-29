from datetime import datetime
import time
from typing import List, Dict, Any
from app.ingestion.base import SourceAdapter, RawOpportunity
from app.ingestion.http_client import http_client
from app.models.opportunity import OpportunityType
from app.core.logging import logger

try:
    import feedparser
    FEEDPARSER_AVAILABLE = True
except ImportError:
    FEEDPARSER_AVAILABLE = False


class RSSAdapter(SourceAdapter):
    """
    Generic RSS / Atom feed adapter.
    Accepts configurable feed URLs for company feeds, hackathons, and startup boards.
    """
    name: str = "rss_general"
    type: str = "rss"
    required_env: List[str] = []

    DEFAULT_FEEDS = [
        "https://weworkremotely.com/categories/remote-programming-jobs.rss",
        "https://news.ycombinator.com/jobsrss",
    ]

    async def fetch(self) -> List[RawOpportunity]:
        if not FEEDPARSER_AVAILABLE:
            logger.warning("[RSSAdapter] feedparser not installed; skipping RSS fetch.")
            return []

        feed_urls = self.config.get("feed_urls", self.DEFAULT_FEEDS)
        opportunities: List[RawOpportunity] = []

        for url in feed_urls:
            try:
                logger.info(f"[RSSAdapter] Fetching feed: {url}")
                resp = await http_client.get(url, use_cache=True)
                parsed = feedparser.parse(resp.text)

                for entry in parsed.entries[:25]:
                    guid = entry.get("id") or entry.get("link") or entry.get("title")
                    title = entry.get("title", "Untitled Opportunity")
                    link = entry.get("link", "")
                    summary = entry.get("summary") or entry.get("description", "")
                    author = entry.get("author") or parsed.feed.get("title", "RSS Publisher")

                    posted_at = None
                    if hasattr(entry, "published_parsed") and entry.published_parsed:
                        posted_at = datetime.fromtimestamp(time.mktime(entry.published_parsed))

                    # Heuristic type detection
                    opp_type = OpportunityType.JOB
                    if "intern" in title.lower():
                        opp_type = OpportunityType.INTERNSHIP
                    elif "hackathon" in title.lower() or "challenge" in title.lower():
                        opp_type = OpportunityType.COLLABORATION
                    elif "freelance" in title.lower() or "contract" in title.lower():
                        opp_type = OpportunityType.FREELANCE

                    opportunities.append(
                        RawOpportunity(
                            external_id=f"rss-{guid}",
                            title=title,
                            org=author,
                            url=link,
                            description=summary,
                            type=opp_type,
                            skills=[],
                            location="Remote / See Feed",
                            remote=True,
                            posted_at=posted_at,
                            raw_data={"feed_url": url, "guid": guid},
                        )
                    )
            except Exception as e:
                logger.warning(f"[RSSAdapter] Failed fetching feed {url}: {e}")

        logger.info(f"[RSSAdapter] Successfully parsed {len(opportunities)} items across feeds")
        return opportunities
