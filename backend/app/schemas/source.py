from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class SourceResponse(BaseModel):
    id: str
    name: str
    type: str
    enabled: bool
    interval_hours: int
    config: Dict[str, Any]
    last_run_at: Optional[datetime] = None
    last_error: Optional[str] = None
    needs_config: bool = False
    missing_env_keys: List[str] = Field(default_factory=list)

    class Config:
        from_attributes = True


class SourceUpdate(BaseModel):
    enabled: Optional[bool] = None
    interval_hours: Optional[int] = Field(None, ge=1, le=168)
    config: Optional[Dict[str, Any]] = None


class IngestionRunResponse(BaseModel):
    id: str
    source_id: str
    source_name: Optional[str] = None
    status: str
    started_at: datetime
    finished_at: Optional[datetime] = None
    fetched: int
    new: int
    duplicates: int
    errors: List[str] = Field(default_factory=list)
    tokens_used: int

    class Config:
        from_attributes = True
