import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.models.source import Source
from app.models.opportunity import Opportunity, OpportunityType
from app.ingestion.base import RawOpportunity, OpportunityCreate
from app.ingestion.adapters.mock_adapter import MockAdapter
from app.ingestion.adapters.remotive_adapter import RemotiveAdapter
from app.ingestion.adapters.remoteok_adapter import RemoteOKAdapter
from app.ingestion.adapters.rss_adapter import RSSAdapter
from app.ingestion.adapters.adzuna_adapter import AdzunaAdapter
from app.ingestion.adapters.github_adapter import GitHubAdapter
from app.ingestion.adapters.hackernews_adapter import HackerNewsAdapter
from app.ingestion.adapters.reddit_adapter import RedditAdapter
from app.ingestion.adapters.email_adapter import EmailAlertAdapter
from app.ingestion.normalizer import ClaudeNormalizer
from app.ingestion.deduplication import clean_url, compute_content_hash, compute_text_similarity, is_expired
from app.ingestion.pipeline import IngestionPipeline


@pytest.mark.asyncio
async def test_mock_adapter():
    adapter = MockAdapter()
    items = await adapter.fetch()
    assert len(items) >= 4
    assert any(i.type == OpportunityType.INTERNSHIP for i in items)
    assert any(i.type == OpportunityType.FREELANCE for i in items)


@pytest.mark.asyncio
async def test_remotive_adapter_mocked():
    adapter = RemotiveAdapter()
    mock_payload = {
        "jobs": [
            {
                "id": 1234,
                "title": "Backend Python Engineer",
                "company_name": "Acme Corp",
                "url": "https://remotive.com/jobs/1234?utm_source=rss",
                "description": "FastAPI and PostgreSQL work.",
                "category": "Software Development",
                "tags": ["Python", "FastAPI", "Docker"],
                "candidate_required_location": "Worldwide",
                "salary": "$90,000 - $120,000",
                "publication_date": "2026-10-25T10:00:00Z",
            }
        ]
    }
    with patch("app.ingestion.http_client.http_client.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_payload
        mock_get.return_value = mock_resp

        items = await adapter.fetch()
        assert len(items) == 1
        assert items[0].title == "Backend Python Engineer"
        assert items[0].pay_min == 90000.0
        assert items[0].pay_max == 120000.0


@pytest.mark.asyncio
async def test_remoteok_adapter_mocked():
    adapter = RemoteOKAdapter()
    mock_payload = [
        {"legal": "disclaimer"},
        {
            "id": "5566",
            "position": "Frontend React Specialist",
            "company": "UI Labs",
            "url": "https://remoteok.com/remote-jobs/5566",
            "description": "React TypeScript PWA.",
            "tags": ["react", "typescript"],
            "location": "Remote",
            "salary_min": 80000,
            "salary_max": 110000,
            "date": "2026-10-24T12:00:00Z",
        },
    ]
    with patch("app.ingestion.http_client.http_client.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_payload
        mock_get.return_value = mock_resp

        items = await adapter.fetch()
        assert len(items) == 1
        assert items[0].title == "Frontend React Specialist"
        assert items[0].pay_min == 80000.0


@pytest.mark.asyncio
async def test_rss_adapter_mocked():
    adapter = RSSAdapter(config={"feed_urls": ["https://example.com/feed.xml"]})
    fake_rss = """<?xml version="1.0" encoding="utf-8"?>
    <rss version="2.0">
      <channel>
        <title>Tech Feeds</title>
        <item>
          <title>AI Research Intern</title>
          <link>https://example.com/job/1</link>
          <description>Join as intern</description>
        </item>
      </channel>
    </rss>"""
    with patch("app.ingestion.http_client.http_client.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.text = fake_rss
        mock_get.return_value = mock_resp

        items = await adapter.fetch()
        assert len(items) == 1
        assert items[0].type == OpportunityType.INTERNSHIP


@pytest.mark.asyncio
async def test_adzuna_adapter_mocked(monkeypatch):
    monkeypatch.setenv("ADZUNA_APP_ID", "test_id")
    monkeypatch.setenv("ADZUNA_APP_KEY", "test_key")
    adapter = AdzunaAdapter()
    mock_payload = {
        "results": [
            {
                "id": "9988",
                "title": "Software Intern",
                "company": {"display_name": "Bangalore Tech"},
                "redirect_url": "https://adzuna.in/job/9988",
                "description": "Internship in Python and React",
                "location": {"display_name": "Bengaluru, India"},
                "salary_min": 35000,
                "created": "2026-10-26T08:00:00Z",
            }
        ]
    }
    with patch("app.ingestion.http_client.http_client.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_payload
        mock_get.return_value = mock_resp

        items = await adapter.fetch()
        assert len(items) == 1
        assert items[0].type == OpportunityType.INTERNSHIP
        assert items[0].currency == "INR"


@pytest.mark.asyncio
async def test_github_adapter_mocked(monkeypatch):
    monkeypatch.setenv("GITHUB_TOKEN", "dummy_gh_token")
    adapter = GitHubAdapter()
    mock_payload = {
        "items": [
            {
                "id": 1001,
                "title": "Add pgvector support to queries",
                "html_url": "https://github.com/org/repo/issues/1001",
                "body": "Good first issue for beginners.",
                "repository_url": "https://api.github.com/repos/org/repo",
                "labels": [{"name": "good first issue"}, {"name": "python"}],
                "created_at": "2026-10-27T10:00:00Z",
            }
        ]
    }
    with patch("app.ingestion.http_client.http_client.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_payload
        mock_get.return_value = mock_resp

        items = await adapter.fetch()
        assert len(items) == 1
        assert items[0].type == OpportunityType.COLLABORATION


@pytest.mark.asyncio
async def test_hackernews_adapter_mocked():
    adapter = HackerNewsAdapter()
    with patch("app.ingestion.http_client.http_client.get") as mock_get:
        # Mock user -> stories -> comments
        def side_effect(url, **kwargs):
            mock = MagicMock()
            if "user/whoishiring" in url:
                mock.json.return_value = {"submitted": [111]}
            elif "item/111" in url:
                mock.json.return_value = {"id": 111, "type": "story", "title": "Ask HN: Who is hiring?", "kids": [222]}
            elif "item/222" in url:
                mock.json.return_value = {
                    "id": 222,
                    "text": "Stripe | Remote | Senior Backend Engineer | Python",
                    "time": 1793200000,
                }
            return mock

        mock_get.side_effect = side_effect
        items = await adapter.fetch()
        assert len(items) >= 1
        assert "Stripe" in items[0].org


@pytest.mark.asyncio
async def test_reddit_adapter_mocked():
    adapter = RedditAdapter()
    mock_payload = {
        "data": {
            "children": [
                {
                    "data": {
                        "id": "red1",
                        "title": "[Hiring] Need Python Developer for Web Automation",
                        "selftext": "Budget $1500 remote.",
                        "permalink": "/r/forhire/comments/red1",
                        "author": "redditor123",
                        "created_utc": 1793200000,
                    }
                }
            ]
        }
    }
    with patch("app.ingestion.http_client.http_client.get") as mock_get:
        mock_resp = MagicMock()
        mock_resp.json.return_value = mock_payload
        mock_get.return_value = mock_resp

        items = await adapter.fetch()
        assert len(items) >= 1
        assert items[0].type == OpportunityType.FREELANCE


def test_url_cleaning_and_content_hash():
    dirty_url = "https://example.com/jobs/dev?utm_source=newsletter&utm_medium=email&ref=hacker_news"
    cleaned = clean_url(dirty_url)
    assert "utm_source" not in cleaned
    assert "ref" not in cleaned
    assert cleaned == "https://example.com/jobs/dev"

    h1 = compute_content_hash("Full Stack Engineer", "Anthropic", cleaned)
    h2 = compute_content_hash("full stack engineer!", "anthropic", "https://example.com/jobs/dev")
    assert h1 == h2  # Hash invariant to case / punctuation


def test_deduplication_similarity_and_expiry():
    s1 = "Senior Full-Stack Engineer at Anthropic"
    s2 = "Senior Full Stack Engineer at Anthropic Corp"
    sim = compute_text_similarity(s1, s2)
    assert sim >= 85.0

    # Expiry test: past deadline
    past_opp = OpportunityCreate(
        source_id="src1",
        external_id="exp1",
        type=OpportunityType.JOB,
        title="Expired Job",
        org="Old Org",
        description="Expired",
        url="https://old.com",
        deadline=datetime.utcnow() - timedelta(days=2),
    )
    assert is_expired(past_opp) is True

    # Expiry test: older than 45 days
    old_opp = OpportunityCreate(
        source_id="src1",
        external_id="old1",
        type=OpportunityType.JOB,
        title="Old Job",
        org="Old Org",
        description="Old",
        url="https://old.com",
        posted_at=datetime.utcnow() - timedelta(days=50),
    )
    assert is_expired(old_opp, max_age_days=45) is True


@pytest.mark.asyncio
async def test_normalization_with_claude_mocked():
    normalizer = ClaudeNormalizer()
    normalizer.api_key = "dummy_claude_key"

    items = [
        OpportunityCreate(
            source_id="src_test",
            external_id="raw_1",
            type=OpportunityType.JOB,
            title="FastAPI & React Developer",
            org="FastVenture",
            description="Looking for an engineer with skills in FastAPI, React, Docker, and PostgreSQL.",
            url="https://example.com/1",
        )
    ]

    mock_json = '{"postings": [{"index": 0, "type": "job", "skills": ["FastAPI", "React", "Docker"], "location": "Remote", "remote": true, "pay_min": 5000.0}]}'
    with patch.object(ClaudeNormalizer, "_call_claude", return_value=(mock_json, 150)):
        result, tokens = await normalizer.normalize_batch(items)
        assert tokens == 150
        assert "FastAPI" in result[0].skills
        assert result[0].pay_min == 5000.0


def test_sources_api_and_manual_opportunity(client: TestClient):
    # 1. GET /api/v1/sources
    resp = client.get("/api/v1/sources")
    assert resp.status_code == 200
    sources = resp.json()
    assert len(sources) >= 5
    mock_src = next((s for s in sources if s["name"] == "mock"), None)
    assert mock_src is not None
    assert mock_src["needs_config"] is False

    # 2. Trigger mock run: POST /api/v1/sources/{id}/run
    run_resp = client.post(f"/api/v1/sources/{mock_src['id']}/run")
    assert run_resp.status_code == 200
    run_data = run_resp.json()
    assert run_data["status"] == "success"
    assert run_data["fetched"] >= 4
    assert run_data["new"] >= 1

    # 3. Verify opportunities in GET /api/v1/opportunities
    opp_resp = client.get("/api/v1/opportunities")
    assert opp_resp.status_code == 200
    opps = opp_resp.json()
    assert opps["total"] >= 1
    assert len(opps["items"]) >= 1

    # 4. Test manual opportunity from text
    text_payload = {
        "text": "Stripe is hiring a Senior Software Engineer for Payment Protocols in San Francisco or Remote. Skills: Ruby, Go, Distributed Systems.",
        "source_url": "https://stripe.com/jobs/manual-1",
    }
    create_resp = client.post("/api/v1/opportunities/from-text", json=text_payload)
    assert create_resp.status_code == 201
    assert "Stripe" in create_resp.json()["org"] or "Stripe" in create_resp.json()["title"]
