# Opportunity Radar — Architecture & Design Specification

## Overview
**Opportunity Radar** is an AI agent + mobile-first Progressive Web Application (PWA) that discovers internships, full-time jobs, freelance gigs, business deals/tenders, and collaborations (hackathons, open-source, co-founder calls), scores them against your profile using Claude AI + pgvector embeddings, notifies you, and assists in drafting applications.

---

## Clean Architecture Layers

```
                    ┌──────────────────────────────────┐
                    │      React PWA (Vite + TS)       │
                    │  Mobile-First, Offline-Ready     │
                    └─────────────────┬────────────────┘
                                      │ HTTP / JSON (JWT Bearer)
                    ┌─────────────────▼────────────────┐
                    │       FastAPI Routers            │
                    │  /api/v1/auth, /profile, /match  │
                    └─────────────────┬────────────────┘
                                      │
                    ┌─────────────────▼────────────────┐
                    │       Business Services          │
                    │ AuthService, ProfileService,     │
                    │ AIService (Claude SDK), Matching │
                    └─────────────────┬────────────────┘
                                      │
                    ┌─────────────────▼────────────────┐
                    │         Repositories             │
                    │ UserRepository, ProfileRepo,     │
                    │ OpportunityRepo, MatchRepo       │
                    └─────────────────┬────────────────┘
                                      │ SQLAlchemy 2.0 ORM
                    ┌─────────────────▼────────────────┐
                    │    PostgreSQL 16 + pgvector      │
                    │     Alembic-Versioned Schema     │
                    └──────────────────────────────────┘
```

---

## Database Schema (Phase 1)

1. **`users`**
   - `id`: UUID (Primary Key)
   - `email`: VARCHAR(255) (Unique, Indexed)
   - `password_hash`: VARCHAR(255)
   - `created_at`: TIMESTAMP

2. **`profiles`**
   - `id`: UUID (Primary Key)
   - `user_id`: UUID (Foreign Key `users.id`, Unique)
   - `full_name`: VARCHAR(255)
   - `headline`: VARCHAR(255)
   - `skills`: JSON array of strings
   - `education`: TEXT
   - `experience_summary`: TEXT
   - `links`: JSONB (github, linkedin, portfolio, twitter)
   - `resume_text`: TEXT
   - `location`: VARCHAR(255)
   - `remote_ok`: BOOLEAN
   - `min_stipend`: FLOAT
   - `min_freelance_budget`: FLOAT
   - `opportunity_types`: JSON array (`internship`, `job`, `freelance`, `deal`, `collaboration`)
   - `keywords_include`: JSON array
   - `keywords_exclude`: JSON array
   - `match_threshold`: INT (default 70)
   - `profile_embedding`: `vector(1536)` (pgvector)

3. **`sources`**
   - `id`: UUID (Primary Key)
   - `name`: VARCHAR(100) (Unique)
   - `type`: VARCHAR(50) (e.g. `api`, `rss`, `public_feed`)
   - `config`: JSONB
   - `enabled`: BOOLEAN
   - `last_run_at`: TIMESTAMP

4. **`opportunities`**
   - `id`: UUID (Primary Key)
   - `source_id`: UUID (Foreign Key `sources.id`)
   - `external_id`: VARCHAR(255)
   - `type`: ENUM (`internship`, `job`, `freelance`, `deal`, `collaboration`)
   - `title`: VARCHAR(500)
   - `org`: VARCHAR(255)
   - `description`: TEXT
   - `skills`: JSON array
   - `location`: VARCHAR(255)
   - `remote`: BOOLEAN
   - `pay_min`: FLOAT, `pay_max`: FLOAT, `currency`: VARCHAR(10)
   - `deadline`: TIMESTAMP, `posted_at`: TIMESTAMP
   - `url`: TEXT
   - `raw`: JSONB
   - `content_hash`: VARCHAR(64) (Indexed)
   - `embedding`: `vector(1536)` (pgvector)
   - `created_at`: TIMESTAMP
   - **Constraints**: `UNIQUE(source_id, external_id)`

5. **`matches`**
   - `id`: UUID (Primary Key)
   - `user_id`: UUID (Foreign Key `users.id`)
   - `opportunity_id`: UUID (Foreign Key `opportunities.id`)
   - `score`: FLOAT (0-100)
   - `reason`: TEXT
   - `red_flags`: JSON array
   - `status`: ENUM (`new`, `saved`, `dismissed`, `applied`)
   - `created_at`: TIMESTAMP
   - **Constraints**: `UNIQUE(user_id, opportunity_id)`

6. **`applications`**
   - `id`: UUID (Primary Key)
   - `user_id`: UUID (Foreign Key `users.id`)
   - `opportunity_id`: UUID (Foreign Key `opportunities.id`)
   - `stage`: ENUM (`saved`, `applied`, `interview`, `offer`, `rejected`)
   - `notes`: TEXT
   - `applied_at`: TIMESTAMP
   - `follow_up_at`: TIMESTAMP
   - `drafts`: JSONB (cover letter drafts, customized resume points)
   - **Constraints**: `UNIQUE(user_id, opportunity_id)`

7. **`notifications`**
   - `id`: UUID (Primary Key)
   - `user_id`: UUID (Foreign Key `users.id`)
   - `match_id`: UUID (Foreign Key `matches.id`, Nullable)
   - `title`: VARCHAR(255)
   - `body`: TEXT
   - `urgency`: VARCHAR(20) (`low`, `medium`, `high`)
   - `read`: BOOLEAN
   - `created_at`: TIMESTAMP

8. **`push_subscriptions`**
   - `id`: UUID (Primary Key)
   - `user_id`: UUID (Foreign Key `users.id`)
   - `endpoint`: TEXT (Unique)
   - `keys`: JSONB (p256dh, auth)

---

## AI Agent Integration: Anthropic Claude
- Python SDK: `anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)`
- Configurable model via `CLAUDE_MODEL` (default: `claude-sonnet-5-5`).
- The agent extracts structured JSON from resumes, calculates match scores, flags discrepancies, and drafts application materials.
- **Strict Guardrail**: The agent **NEVER** auto-submits applications. The user always reviews drafts and applies manually.
