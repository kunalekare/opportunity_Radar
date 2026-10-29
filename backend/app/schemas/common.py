from pydantic import BaseModel
from typing import Optional, Generic, TypeVar, Any

T = TypeVar("T")


class ResponseModel(BaseModel, Generic[T]):
    success: bool = True
    message: Optional[str] = None
    data: Optional[T] = None


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "opportunity-radar-api"
    version: str = "0.1.0"
    database: str = "connected"
