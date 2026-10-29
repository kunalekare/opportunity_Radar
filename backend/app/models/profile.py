import uuid
from typing import List, Optional
from sqlalchemy import String, Text, Boolean, Integer, Float, ForeignKey, JSON
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base
from app.models.types import get_vector_type


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    headline: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Store skills as JSON array for cross-DB compatibility (Postgres/SQLite)
    skills: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    education: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    experience_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    links: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    resume_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    remote_ok: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    min_stipend: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    min_freelance_budget: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    
    opportunity_types: Mapped[List[str]] = mapped_column(
        JSON, default=lambda: ["internship", "job", "freelance"], nullable=False
    )
    keywords_include: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    keywords_exclude: Mapped[List[str]] = mapped_column(JSON, default=list, nullable=False)
    match_threshold: Mapped[int] = mapped_column(Integer, default=70, nullable=False)
    
    # Vector embedding for semantic match
    profile_embedding = mapped_column(get_vector_type(1536), nullable=True)

    # Relationships
    user = relationship("User", back_populates="profile")
