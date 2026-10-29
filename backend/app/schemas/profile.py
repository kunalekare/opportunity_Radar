from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ProfileBase(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=255)
    headline: Optional[str] = Field(None, max_length=255)
    skills: List[str] = Field(default_factory=list)
    education: Optional[str] = None
    experience_summary: Optional[str] = None
    links: Dict[str, str] = Field(default_factory=dict)
    location: Optional[str] = None
    remote_ok: bool = True
    min_stipend: Optional[float] = None
    min_freelance_budget: Optional[float] = None
    opportunity_types: List[str] = Field(
        default_factory=lambda: ["internship", "job", "freelance"]
    )
    keywords_include: List[str] = Field(default_factory=list)
    keywords_exclude: List[str] = Field(default_factory=list)
    match_threshold: int = Field(default=70, ge=0, le=100)


class ProfileCreate(ProfileBase):
    resume_text: Optional[str] = None


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    headline: Optional[str] = None
    skills: Optional[List[str]] = None
    education: Optional[str] = None
    experience_summary: Optional[str] = None
    links: Optional[Dict[str, str]] = None
    resume_text: Optional[str] = None
    location: Optional[str] = None
    remote_ok: Optional[bool] = None
    min_stipend: Optional[float] = None
    min_freelance_budget: Optional[float] = None
    opportunity_types: Optional[List[str]] = None
    keywords_include: Optional[List[str]] = None
    keywords_exclude: Optional[List[str]] = None
    match_threshold: Optional[int] = Field(None, ge=0, le=100)


class ProfileResponse(ProfileBase):
    id: str
    user_id: str
    resume_text: Optional[str] = None

    class Config:
        from_attributes = True
