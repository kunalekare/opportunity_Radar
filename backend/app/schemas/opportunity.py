from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from app.models.opportunity import OpportunityType


class OpportunityResponse(BaseModel):
    id: str
    source_id: str
    source_name: Optional[str] = None
    external_id: str
    type: OpportunityType
    title: str
    org: str
    description: str
    skills: List[str] = Field(default_factory=list)
    location: Optional[str] = None
    remote: bool
    pay_min: Optional[float] = None
    pay_max: Optional[float] = None
    currency: Optional[str] = "USD"
    deadline: Optional[datetime] = None
    posted_at: Optional[datetime] = None
    url: str
    created_at: datetime
    duplicate_of_id: Optional[str] = None
    status: str

    class Config:
        from_attributes = True


class OpportunityPaginated(BaseModel):
    items: List[OpportunityResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class OpportunityFromUrlRequest(BaseModel):
    url: str


class OpportunityFromTextRequest(BaseModel):
    text: str = Field(..., min_length=10)
    source_url: Optional[str] = None
