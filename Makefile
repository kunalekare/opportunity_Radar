.PHONY: help up down build restart migrate makemigrations test test-backend test-frontend lint logs shell-backend shell-db seed

help:
	@echo "Opportunity Radar - Commands:"
	@echo "  make up              - Spin up postgres, backend, and frontend via docker-compose"
	@echo "  make down            - Stop and tear down all containers"
	@echo "  make build           - Build container images"
	@echo "  make migrate         - Apply pending Alembic migrations"
	@echo "  make makemigrations  - Generate new Alembic migration revision"
	@echo "  make test            - Run all backend and frontend tests"
	@echo "  make test-backend    - Run pytest test suite in backend"
	@echo "  make test-frontend   - Run frontend TypeScript checks and build test"
	@echo "  make lint            - Run linter checks across codebase"
	@echo "  make logs            - Stream logs from all docker containers"
	@echo "  make shell-backend   - Open interactive shell in backend container"
	@echo "  make shell-db        - Connect to PostgreSQL database with psql"

up:
	docker compose up --build -d

down:
	docker compose down

build:
	docker compose build

restart:
	docker compose restart

migrate:
	docker compose exec backend alembic upgrade head

makemigrations:
	docker compose exec backend alembic revision --autogenerate -m "$(m)"

test: test-backend test-frontend

test-backend:
	docker compose exec backend pytest -v

test-frontend:
	npm run lint && npm run build

lint:
	npm run lint

logs:
	docker compose logs -f

shell-backend:
	docker compose exec backend bash

shell-db:
	docker compose exec postgres psql -U postgres -d opportunity_radar
