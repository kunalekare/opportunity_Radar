from app.ingestion.adapters.mock_adapter import MockAdapter
from app.ingestion.adapters.rss_adapter import RSSAdapter
from app.ingestion.adapters.remotive_adapter import RemotiveAdapter
from app.ingestion.adapters.remoteok_adapter import RemoteOKAdapter
from app.ingestion.adapters.adzuna_adapter import AdzunaAdapter
from app.ingestion.adapters.github_adapter import GitHubAdapter
from app.ingestion.adapters.hackernews_adapter import HackerNewsAdapter
from app.ingestion.adapters.reddit_adapter import RedditAdapter
from app.ingestion.adapters.email_adapter import EmailAlertAdapter

__all__ = [
    "MockAdapter",
    "RSSAdapter",
    "RemotiveAdapter",
    "RemoteOKAdapter",
    "AdzunaAdapter",
    "GitHubAdapter",
    "HackerNewsAdapter",
    "RedditAdapter",
    "EmailAlertAdapter",
]
