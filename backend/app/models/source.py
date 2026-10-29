import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Text, Integer, Boolean, DateTime, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # api, rss, public_feed, email
    config: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    interval_hours: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    last_run_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    last_error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    opportunities = relationship("Opportunity", back_populates="source", cascade="all, delete-orphan")
    runs = relationship("IngestionRun", back_populates="source", cascade="all, delete-orphan")
