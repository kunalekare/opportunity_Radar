import enum
import uuid
from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    String, Text, Float, DateTime, ForeignKey,
    UniqueConstraint, JSON, Enum as SAEnum
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base


class MatchStatus(str, enum.Enum):
    NEW = "new"
    SAVED = "saved"
    DISMISSED = "dismissed"
    APPLIED = "applied"


class Match(Base):
    __tablename__ = "matches"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    opportunity_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("opportunities.id", ondelete="CASCADE"), nullable=False, index=True
    )
    score: Mapped[float] = mapped_column(Float, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    red_flags: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    status: Mapped[MatchStatus] = mapped_column(
        SAEnum(MatchStatus, name="match_status_enum"), default=MatchStatus.NEW, nullable=False, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    __table_args__ = (
        UniqueConstraint("user_id", "opportunity_id", name="uq_user_opportunity_match"),
    )

    # Relationships
    user = relationship("User", back_populates="matches")
    opportunity = relationship("Opportunity", back_populates="matches")
    notifications = relationship("Notification", back_populates="match", cascade="all, delete-orphan")
