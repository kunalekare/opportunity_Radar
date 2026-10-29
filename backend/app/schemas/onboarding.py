from typing import List, Optional, Dict
from pydantic import BaseModel, Field


class ExtractedResumeData(BaseModel):
    full_name: Optional[str] = None
    headline: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    education: Optional[str] = None
    experience_summary: Optional[str] = None
    suggested_keywords: List[str] = Field(default_factory=list)
    location: Optional[str] = None
    extracted_text: Optional[str] = None
    extraction_source: str = "ai_claude_parser"


class OnboardingCompleteRequest(BaseModel):
    full_name: str
    headline: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    education: Optional[str] = None
    experience_summary: Optional[str] = None
    links: Dict[str, str] = Field(default_factory=dict)
    resume_text: Optional[str] = None
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
