import enum
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    String, Text, Boolean, Float, DateTime, ForeignKey,
    UniqueConstraint, Index, JSON, Enum as SAEnum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.models.types import get_vector_type


class OpportunityType(str, enum.Enum):
    INTERNSHIP = "internship"
    JOB = "job"
    FREELANCE = "freelance"
    DEAL = "deal"
    COLLABORATION = "collaboration"


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    source_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("sources.id", ondelete="CASCADE"), nullable=False, index=True
    )
    external_id: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[OpportunityType] = mapped_column(
        SAEnum(OpportunityType, name="opportunity_type_enum"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    org: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    skills: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    remote: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    pay_min: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    pay_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(10), default="USD", nullable=True)
    deadline: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    posted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    raw: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    
    embedding = mapped_column(get_vector_type(1536), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Constraints & Indexes
    __table_args__ = (
        UniqueConstraint("source_id", "external_id", name="uq_source_external_id"),
        Index("idx_opportunity_content_hash", "content_hash"),
        Index("idx_opportunity_type_posted", "type", "posted_at"),
    )

    # Relationships
    source = relationship("Source", back_populates="opportunities")
    matches = relationship("Match", back_populates="opportunity", cascade="all, delete-orphan")
    applications = relationship("Application", back_populates="opportunity", cascade="all, delete-orphan")
