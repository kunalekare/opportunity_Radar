from typing import Dict, Type, Optional, List
from sqlalchemy.orm import Session
from app.models.source import Source
from app.ingestion.base import SourceAdapter
from app.ingestion.adapters.mock_adapter import MockAdapter
from app.ingestion.adapters.rss_adapter import RSSAdapter
from app.ingestion.adapters.remotive_adapter import RemotiveAdapter
from app.ingestion.adapters.remoteok_adapter import RemoteOKAdapter
from app.ingestion.adapters.adzuna_adapter import AdzunaAdapter
from app.ingestion.adapters.github_adapter import GitHubAdapter
from app.ingestion.adapters.hackernews_adapter import HackerNewsAdapter
from app.ingestion.adapters.reddit_adapter import RedditAdapter
from app.ingestion.adapters.email_adapter import EmailAlertAdapter
from app.core.logging import logger

ADAPTER_REGISTRY: Dict[str, Type[SourceAdapter]] = {
    "mock": MockAdapter,
    "rss_general": RSSAdapter,
    "remotive": RemotiveAdapter,
    "remoteok": RemoteOKAdapter,
    "adzuna": AdzunaAdapter,
    "github": GitHubAdapter,
    "hackernews": HackerNewsAdapter,
    "reddit": RedditAdapter,
    "email_alert": EmailAlertAdapter,
}

DEFAULT_SOURCES = [
    {
        "name": "mock",
        "type": "mock",
        "enabled": True,
        "interval_hours": 3,
        "config": {"description": "Fixture data generator for testing and demo environments."},
    },
    {
        "name": "remotive",
        "type": "api",
        "enabled": True,
        "interval_hours": 3,
        "config": {"api_url": "https://remotive.com/api/remote-jobs?limit=30"},
    },
    {
        "name": "remoteok",
        "type": "api",
        "enabled": True,
        "interval_hours": 3,
        "config": {"api_url": "https://remoteok.com/api"},
    },
    {
        "name": "rss_general",
        "type": "rss",
        "enabled": True,
        "interval_hours": 3,
        "config": {
            "feed_urls": [
                "https://weworkremotely.com/categories/remote-programming-jobs.rss",
                "https://news.ycombinator.com/jobsrss",
            ]
        },
    },
    {
        "name": "hackernews",
        "type": "api",
        "enabled": True,
        "interval_hours": 6,
        "config": {"description": "Hacker News monthly Who is hiring & Freelancer threads."},
    },
    {
        "name": "github",
        "type": "api",
        "enabled": True,
        "interval_hours": 6,
        "config": {"query": 'label:"good first issue" state:open language:python language:typescript'},
    },
    {
        "name": "reddit",
        "type": "api",
        "enabled": True,
        "interval_hours": 3,
        "config": {"subreddits": ["forhire", "internships"]},
    },
    {
        "name": "adzuna",
        "type": "api",
        "enabled": False,
        "interval_hours": 6,
        "config": {"country": "in", "query": "software intern python react"},
    },
    {
        "name": "email_alert",
        "type": "email",
        "enabled": False,
        "interval_hours": 1,
        "config": {"folder": "INBOX"},
    },
]


def get_adapter_class(source_name: str) -> Optional[Type[SourceAdapter]]:
    return ADAPTER_REGISTRY.get(source_name)


def create_adapter(source: Source) -> Optional[SourceAdapter]:
    adapter_cls = get_adapter_class(source.name)
    if not adapter_cls:
        # Fallback to type matching
        for cls in ADAPTER_REGISTRY.values():
            if cls.type == source.type:
                return cls(config=source.config)
        return None
    return adapter_cls(config=source.config)


def seed_sources(db: Session) -> List[Source]:
    """Ensures all standard sources exist in the database."""
    seeded = []
    for s_data in DEFAULT_SOURCES:
        existing = db.query(Source).filter(Source.name == s_data["name"]).first()
        if not existing:
            source = Source(
                name=s_data["name"],
                type=s_data["type"],
                enabled=s_data["enabled"],
                interval_hours=s_data["interval_hours"],
                config=s_data["config"],
            )
            db.add(source)
            seeded.append(source)
    if seeded:
        db.commit()
        logger.info(f"Seeded {len(seeded)} new sources into database.")
    return db.query(Source).all()
