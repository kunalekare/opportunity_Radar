# Opportunity Radar

AI agent and mobile-first Progressive Web Application (PWA) that continuously discovers internships, jobs, freelance gigs, business deals, and collaborations, scores them against your profile using Claude AI + pgvector, sends proactive notifications, and helps you craft customized application drafts.

---

## Monorepo Layout
```
├── backend/                  # FastAPI (Python 3.11), SQLAlchemy 2.0, Alembic
│   ├── alembic/              # Database migration scripts (001_initial, 002_ingestion)
│   ├── app/
│   │   ├── api/v1/           # API Routers (auth, profile, onboarding, sources, ingestion, opportunities)
│   │   ├── core/             # Configuration, structured logging, JWT security
│   │   ├── db/               # SQLAlchemy engine & session factory
│   │   ├── ingestion/        # SourceAdapter framework, registry, scheduler, deduplication, normalizer
│   │   │   └── adapters/     # Mock, Remotive, RemoteOK, RSS, Adzuna, GitHub, HackerNews, Reddit, Email
│   │   ├── models/           # Declarative models (users, profiles, sources, opportunities, ingestion_runs, etc.)
│   │   ├── repositories/     # Data access layer
│   │   ├── schemas/          # Pydantic v2 schemas
│   │   ├── services/         # Business logic & Claude AI normalizer
│   │   └── main.py           # FastAPI entrypoint with lifespan scheduler & source seeding
│   ├── tests/                # Pytest suites for auth, profile, and ingestion pipeline
│   ├── Dockerfile
│   └── requirements.txt
├── src/                      # Frontend: React 19 + TypeScript + Vite + Tailwind PWA
│   ├── components/           # PWA install prompt, layout, radar widgets, AddOpportunityModal
│   ├── pages/                # Auth, Onboarding, Radar Dashboard, Sources Management, Profile
│   ├── services/             # Typed API Client with standalone preview fallback
│   └── App.tsx
├── docs/
│   ├── architecture.md       # Architecture specifications & schemas
│   └── sources.md            # Adapter documentation, API keys, and rate limits
├── docker-compose.yml        # PostgreSQL (pgvector) + Backend + Frontend
├── Makefile                  # Lifecycle commands (make up, make migrate, make test)
└── .env.example              # Environment variables template
```

---

## Quick Start with Docker (Recommended)

### 1. Copy Environment File
```bash
cp .env.example .env
```

### 2. Launch Stack & Apply Migrations
```bash
make up
make migrate
```
Access points:
- **Frontend PWA**: `http://localhost:3000`
- **FastAPI Backend**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/api/v1/docs`

### 3. Run Ingestion Tests
```bash
make test
```

To view real-time logs from all services:
```bash
make logs
```

---

## Running Locally Without Docker

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run migrations (including pgvector, sources, and ingestion_runs)
alembic upgrade head

# Run tests
pytest -v

# Start FastAPI dev server with background scheduler
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
npm install
npm run dev
```

---

## Supported Source Adapters

| Adapter | Description | Required Environment Keys |
| :--- | :--- | :--- |
| **`mock`** | High-fidelity test fixture data across all 5 opportunity types | None |
| **`remotive`** | Official Remotive remote jobs API | None |
| **`remoteok`** | Official RemoteOK remote jobs API | None |
| **`rss_general`**| Generic RSS/Atom feeds (WeWorkRemotely, YC jobs, hackathons) | None |
| **`hackernews`** | Official Hacker News monthly 'Who is hiring' & Freelancer threads | None |
| **`github`** | GitHub issues labeled "good first issue" / "help wanted" | `GITHUB_TOKEN` |
| **`reddit`** | Reddit subreddits: r/forhire (hiring), r/internships | `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET` |
| **`adzuna`** | Adzuna Jobs & Internships API (India & Global) | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` |
| **`email_alert`**| Dedicated IMAP alert inbox (LinkedIn, Internshala, Naukri, Unstop) | `IMAP_SERVER`, `IMAP_USER`, `IMAP_PASSWORD` |

See [docs/sources.md](docs/sources.md) for full configuration steps and developer portal links.

---

## Manual Additions & Guardrails
- **Add by URL**: `POST /api/v1/opportunities/from-url` fetches public listings, strips HTML, and uses Claude to extract fields. If a site blocks scraping, an informative error invites using `/from-text`.
- **Add by Text**: `POST /api/v1/opportunities/from-text` parses raw job/contract/hackathon descriptions directly.
- **Strict Guardrail**: The AI agent drafts applications for user review; automatic submission is strictly disallowed.
