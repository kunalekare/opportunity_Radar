from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "Opportunity Radar"
    VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]
    
    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        return ["*"]

    # Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_PORT: int = 5432
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "opportunity_radar"
    DATABASE_URL: str | None = None

    @property
    def sync_database_uri(self) -> str:
        if self.DATABASE_URL:
            # Normalize to psycopg2 if raw postgres://
            url = self.DATABASE_URL
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql://", 1)
            return url
        return f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}@{self.POSTGRES_SERVER}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"

    # JWT Authentication
    SECRET_KEY: str = "dev-secret-key-change-in-production-opportunity-radar-jwt-secret-9941"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for convenience

    # Anthropic Claude API
    ANTHROPIC_API_KEY: str | None = None
    CLAUDE_MODEL: str = "claude-sonnet-5-5"

    # Ingestion & Scheduler Config
    DEMO_MODE: bool = False
    MAX_OPPORTUNITY_AGE_DAYS: int = 45
    DEFAULT_INGESTION_INTERVAL_HOURS: int = 3
    USER_AGENT: str = "OpportunityRadar/1.0 (+https://opportunityradar.app/bot; contact@opportunityradar.app)"

    # Adapter API Credentials
    ADZUNA_APP_ID: str | None = None
    ADZUNA_APP_KEY: str | None = None
    ADZUNA_COUNTRY: str = "in"  # Support India, us, gb, etc.
    GITHUB_TOKEN: str | None = None
    REDDIT_CLIENT_ID: str | None = None
    REDDIT_CLIENT_SECRET: str | None = None
    REDDIT_USER_AGENT: str = "OpportunityRadar:v1.0 (by /u/opportunityradar)"
    
    # Email IMAP Adapter Credentials
    IMAP_SERVER: str | None = None
    IMAP_PORT: int = 993
    IMAP_USER: str | None = None
    IMAP_PASSWORD: str | None = None
    IMAP_FOLDER: str = "INBOX"

    # Embeddings Provider (Pluggable)
    EMBEDDING_PROVIDER: str = "mock"  # mock, local, openai, gemini, voyagae
    EMBEDDING_API_KEY: str | None = None

    # Notification & Push credentials (Phase 1 placeholders ready for Phase 2/3)
    VAPID_PUBLIC_KEY: str | None = None
    VAPID_PRIVATE_KEY: str | None = None
    VAPID_CLAIM_EMAIL: str | None = None
    TELEGRAM_BOT_TOKEN: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
    )


settings = Settings()
