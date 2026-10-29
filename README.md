# Opportunity Radar

AI agent and mobile-first Progressive Web Application (PWA) that continuously discovers internships, jobs, freelance gigs, business deals, and collaborations, scores them against your profile using Claude AI + pgvector, sends proactive notifications, and helps you craft customized application drafts.

---

## Monorepo Layout
```
├── backend/                  # FastAPI (Python 3.11), SQLAlchemy 2.0, Alembic
│   ├── alembic/              # Database migration scripts with pgvector
│   ├── app/
│   │   ├── api/v1/           # API Routers (auth, profile, onboarding, health)
│   │   ├── core/             # Configuration, logging, JWT security
│   │   ├── db/               # SQLAlchemy engine & session factory
│   │   ├── models/           # Declarative models (user_id partitioned)
│   │   ├── repositories/     # Data access layer
│   │   ├── schemas/          # Pydantic v2 schemas
│   │   ├── services/         # Business logic & Claude AI resume parser
│   │   └── main.py           # FastAPI application entrypoint
│   ├── tests/                # Pytest suite for auth and profile endpoints
│   ├── Dockerfile
│   └── requirements.txt
├── src/                      # Frontend: React 19 + TypeScript + Vite + Tailwind
│   ├── components/           # PWA install prompt, layout, radar widgets
│   ├── pages/                # Auth, Onboarding Wizard, Profile & Opportunities
│   ├── services/             # API Client with backend & interactive offline preview
│   └── App.tsx
├── docs/                     # Architecture specifications & schemas
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
*(Add your `ANTHROPIC_API_KEY` for Claude resume parsing and AI scoring. If omitted, the system gracefully uses the built-in heuristic parser).*

### 2. Launch the Stack
```bash
make up
```
This starts:
- **PostgreSQL 16 with pgvector**: `localhost:5432`
- **FastAPI Backend**: `http://localhost:8000` (Swagger docs at `http://localhost:8000/api/v1/docs`)
- **Frontend PWA**: `http://localhost:3000`

### 3. Run Migrations & Tests
```bash
make migrate
make test
```

To view logs:
```bash
make logs
```

To stop containers:
```bash
make down
```

---

## Running Locally Without Docker

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Run tests
pytest -v

# Start FastAPI dev server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Frontend
```bash
npm install
npm run dev
```

---

## Phase 1 Deliverables Summary
- **Scaffold**: Monorepo with `docker-compose.yml`, `.env.example`, `Makefile`, and `docs/architecture.md`.
- **FastAPI Backend**: Clean architecture (routers → services → repositories) with Pydantic settings, structured logging, CORS, and health endpoint.
- **Database**: 8 core tables with SQLAlchemy 2.0 and Alembic migration `001_initial_schema.py` including pgvector support.
- **Auth**: JWT-based register, login, and `/me` endpoints with bcrypt password hashing.
- **Onboarding & AI**: Resume upload (PDF or plain text) parsed via Anthropic Claude SDK with fallback, producing structured skills, education, and keywords.
- **Frontend PWA**: Mobile-first installable React application with full onboarding wizard, preferences selection, and profile editor.
