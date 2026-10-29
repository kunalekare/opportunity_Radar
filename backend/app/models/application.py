import enum
import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import (
    String, Text, DateTime, ForeignKey,
    UniqueConstraint, JSON, Enum as SAEnum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class ApplicationStage(str, enum.Enum):
    SAVED = "saved"
    APPLIED = "applied"
    INTERVIEW = "interview"
    OFFER = "offer"
    REJECTED = "rejected"


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    opportunity_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    stage: Mapped[ApplicationStage] = mapped_column(
        SAEnum(ApplicationStage, name="application_stage_enum"),
        default=ApplicationStage.SAVED,
        nullable=False,
        index=True
    )
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    applied_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    follow_up_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    drafts: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "opportunity_id", name="uq_user_opportunity_application"),
    )

    # Relationships
    user = relationship("User", back_populates="applications")
    opportunity = relationship("Opportunity", back_populates="applications")
