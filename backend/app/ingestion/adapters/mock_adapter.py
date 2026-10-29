from datetime import datetime, timedelta
from typing import List, Dict, Any
from app.ingestion.base import SourceAdapter, RawOpportunity
from app.models.opportunity import OpportunityType


class MockAdapter(SourceAdapter):
    """
    Mock adapter returning high-fidelity fixture opportunities.
    Used by test suites and when DEMO_MODE=true.
    """
    name: str = "mock"
    type: str = "mock"
    required_env: List[str] = []

    async def fetch(self) -> List[RawOpportunity]:
        now = datetime.utcnow()
        return [
            RawOpportunity(
                external_id="mock-opp-001",
                title="AI Systems & Agent Infrastructure Intern",
                org="Anthropic Frontier Labs",
                url="https://anthropic.com/careers/mock-001",
                description="Join the evaluations and developer platform team. Build scalable evaluation pipelines, tool-use agents, and real-time streaming interfaces using the Claude SDK and Python.",
                type=OpportunityType.INTERNSHIP,
                skills=["Python", "FastAPI", "Claude SDK", "PyTorch", "Docker"],
                location="San Francisco, CA / Remote",
                remote=True,
                pay_min=55.0,
                pay_max=70.0,
                currency="USD/hr",
                deadline=now + timedelta(days=21),
                posted_at=now - timedelta(days=1),
                raw_data={"source": "mock_fixture", "tier": "frontier"},
            ),
            RawOpportunity(
                external_id="mock-opp-002",
                title="Full-Stack Developer: Autonomous Opportunity Radar PWA",
                org="Autonomous Ventures Group",
                url="https://remoteok.com/remote-jobs/mock-002",
                description="We need a full-stack engineer to build an automated research radar. Tech stack includes FastAPI, PostgreSQL with pgvector, APScheduler jobs, and React/Tailwind PWA.",
                type=OpportunityType.FREELANCE,
                skills=["FastAPI", "React", "TypeScript", "PostgreSQL", "Docker", "TailwindCSS"],
                location="Global Remote",
                remote=True,
                pay_min=6000.0,
                pay_max=10000.0,
                currency="USD",
                deadline=now + timedelta(days=14),
                posted_at=now - timedelta(days=2),
                raw_data={"source": "mock_fixture", "budget": 10000},
            ),
            RawOpportunity(
                external_id="mock-opp-003",
                title="Founding Software Engineer (Backend / Distributed Systems)",
                org="RadarMind AI (YC W26)",
                url="https://news.ycombinator.com/item?id=mock-003",
                description="Founding engineer role building autonomous enterprise opportunity discovery. $2.5M seed raised. Looking for hands-on Python, PostgreSQL, and scalable API architecture expertise.",
                type=OpportunityType.JOB,
                skills=["Python", "FastAPI", "PostgreSQL", "pgvector", "Redis"],
                location="Remote / New York",
                remote=True,
                pay_min=140000.0,
                pay_max=180000.0,
                currency="USD/yr",
                deadline=now + timedelta(days=30),
                posted_at=now - timedelta(days=3),
                raw_data={"source": "mock_fixture", "equity": "1.0 - 2.5%"},
            ),
            RawOpportunity(
                external_id="mock-opp-004",
                title="Co-Builder / Tech Lead: Agentic Hackathon Challenge",
                org="Open Agents Foundation",
                url="https://github.com/open-agents/collab/issues/mock-004",
                description="Seeking a dedicated collaborator for the Global Agents Hackathon. Teaming up to build multi-modal tool use agents. $50,000 prize pool.",
                type=OpportunityType.COLLABORATION,
                skills=["Python", "TypeScript", "AI Agents", "React"],
                location="Remote",
                remote=True,
                pay_min=20000.0,
                pay_max=50000.0,
                currency="USD Prize",
                deadline=now + timedelta(days=12),
                posted_at=now - timedelta(days=1),
                raw_data={"source": "mock_fixture", "challenge": "agentic-hackathon"},
            ),
        ]
