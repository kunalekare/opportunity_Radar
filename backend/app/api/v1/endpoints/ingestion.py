from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.source import Source
from app.models.ingestion_run import IngestionRun
from app.schemas.source import IngestionRunResponse
from app.ingestion.pipeline import IngestionPipeline

router = APIRouter()


@router.post("/run-all", response_model=List[IngestionRunResponse])
async def run_all_sources(db: Session = Depends(get_db)):
    """Manually trigger ingestion for all enabled sources sequentially."""
    pipeline = IngestionPipeline(db)
    runs = await pipeline.run_all_enabled()

    # Pre-fetch source names
    source_map = {s.id: s.name for s in db.query(Source).all()}

    return [
        IngestionRunResponse(
            id=r.id,
            source_id=r.source_id,
            source_name=source_map.get(r.source_id, "Unknown Source"),
            status=r.status,
            started_at=r.started_at,
            finished_at=r.finished_at,
            fetched=r.fetched,
            new=r.new,
            duplicates=r.duplicates,
            errors=r.errors or [],
            tokens_used=r.tokens_used,
        )
        for r in runs
    ]


@router.get("/runs", response_model=List[IngestionRunResponse])
def get_recent_runs(limit: int = 30, db: Session = Depends(get_db)):
    """List recent ingestion run logs across all sources."""
    runs = (
        db.query(IngestionRun)
        .order_by(IngestionRun.started_at.desc())
        .limit(limit)
        .all()
    )
    source_map = {s.id: s.name for s in db.query(Source).all()}

    return [
        IngestionRunResponse(
            id=r.id,
            source_id=r.source_id,
            source_name=source_map.get(r.source_id, "Unknown Source"),
            status=r.status,
            started_at=r.started_at,
            finished_at=r.finished_at,
            fetched=r.fetched,
            new=r.new,
            duplicates=r.duplicates,
            errors=r.errors or [],
            tokens_used=r.tokens_used,
        )
        for r in runs
    ]
