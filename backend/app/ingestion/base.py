from abc import ABC, abstractmethod
from datetime import datetime
import os
from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel, Field
from app.models.opportunity import OpportunityType


class RawOpportunity(BaseModel):
    """Raw, un-normalized opportunity payload emitted by a source adapter."""
    external_id: str
    title: str
    org: str
    url: str
    description: str
    type: Optional[OpportunityType] = None
    skills: List[str] = Field(default_factory=list)
    location: Optional[str] = None
    remote: Optional[bool] = None
    pay_min: Optional[float] = None
    pay_max: Optional[float] = None
    currency: Optional[str] = "USD"
    deadline: Optional[datetime] = None
    posted_at: Optional[datetime] = None
    raw_data: Dict[str, Any] = Field(default_factory=dict)


class OpportunityCreate(BaseModel):
    """Normalized opportunity ready for validation and database persistence."""
    source_id: str
    external_id: str
    type: OpportunityType
    title: str
    org: str
    description: str
    skills: List[str] = Field(default_factory=list)
    location: Optional[str] = "Remote"
    remote: bool = False
    pay_min: Optional[float] = None
    pay_max: Optional[float] = None
    currency: Optional[str] = "USD"
    deadline: Optional[datetime] = None
    posted_at: Optional[datetime] = None
    url: str
    raw: Dict[str, Any] = Field(default_factory=dict)
    content_hash: Optional[str] = None
    status: str = "active"


class SourceAdapter(ABC):
    """
    Abstract contract that every Opportunity Radar source plugin must implement.
    Respects rate limits, public feeds/official APIs only, and validates environment keys.
    """
    name: str = "base"
    type: str = "api"  # api, rss, public_feed, email, mock
    required_env: List[str] = []

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or {}

    def is_configured(self) -> Tuple[bool, List[str]]:
        """
        Validates whether all required environment variables are present.
        Returns (is_ready, missing_keys).
        """
        missing = [key for key in self.required_env if not os.getenv(key)]
        return len(missing) == 0, missing

    @abstractmethod
    async def fetch(self) -> List[RawOpportunity]:
        """Fetch raw listings from the official API or feed."""
        pass

    def normalize(self, raw: RawOpportunity, source_id: str) -> OpportunityCreate:
        """
        Basic deterministic normalization of raw data into OpportunityCreate schema.
        Additional missing fields can be enriched by Claude Normalizer.
        """
        # Determine fallback type
        opp_type = raw.type or OpportunityType.JOB
        title_lower = raw.title.lower()
        if "intern" in title_lower or "fellowship" in title_lower:
            opp_type = OpportunityType.INTERNSHIP
        elif "contract" in title_lower or "freelance" in title_lower or "gig" in title_lower:
            opp_type = OpportunityType.FREELANCE
        elif "hackathon" in title_lower or "open source" in title_lower or "collab" in title_lower:
            opp_type = OpportunityType.COLLABORATION
        elif "tender" in title_lower or "rfp" in title_lower or "deal" in title_lower:
            opp_type = OpportunityType.DEAL

        # Remote detection heuristic
        remote_flag = bool(raw.remote)
        if not remote_flag and any(w in (raw.location or "").lower() + " " + title_lower for w in ["remote", "anywhere", "worldwide"]):
            remote_flag = True

        return OpportunityCreate(
            source_id=source_id,
            external_id=str(raw.external_id),
            type=opp_type,
            title=raw.title.strip(),
            org=raw.org.strip() if raw.org else "Independent",
            description=raw.description.strip(),
            skills=raw.skills or [],
            location=raw.location or ("Remote" if remote_flag else "Unspecified"),
            remote=remote_flag,
            pay_min=raw.pay_min,
            pay_max=raw.pay_max,
            currency=raw.currency or "USD",
            deadline=raw.deadline,
            posted_at=raw.posted_at or datetime.utcnow(),
            url=raw.url.strip(),
            raw=raw.raw_data or {},
            status="active",
        )
