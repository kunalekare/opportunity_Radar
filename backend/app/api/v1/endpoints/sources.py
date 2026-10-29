from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.source import Source
from app.models.ingestion_run import IngestionRun
from app.schemas.source import SourceResponse, SourceUpdate, IngestionRunResponse
from app.ingestion.registry import create_adapter, seed_sources
from app.ingestion.pipeline import IngestionPipeline
from app.ingestion.scheduler import ingestion_scheduler

router = APIRouter()


@router.get("", response_model=List[SourceResponse])
def get_sources(db: Session = Depends(get_db)):
    """List all ingestion sources with configuration readiness and last execution status."""
    sources = db.query(Source).order_by(Source.name.asc()).all()
    if not sources:
        sources = seed_sources(db)

    results = []
    for s in sources:
        adapter = create_adapter(s)
        is_ready, missing = adapter.is_configured() if adapter else (False, ["No Adapter"])
        results.append(
            SourceResponse(
                id=s.id,
                name=s.name,
                type=s.type,
                enabled=s.enabled,
                interval_hours=s.interval_hours,
                config=s.config,
                last_run_at=s.last_run_at,
                last_error=s.last_error,
                needs_config=not is_ready,
                missing_env_keys=missing,
            )
        )
    return results


@router.patch("/{source_id}", response_model=SourceResponse)
def update_source(source_id: str, payload: SourceUpdate, db: Session = Depends(get_db)):
    """Enable/disable a source, modify execution interval, or update config parameters."""
    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found.")

    if payload.enabled is not None:
        source.enabled = payload.enabled
    if payload.interval_hours is not None:
        source.interval_hours = payload.interval_hours
    if payload.config is not None:
        source.config = payload.config

    db.commit()
    db.refresh(source)

    # Refresh scheduler jobs
    ingestion_scheduler.reload_jobs()

    adapter = create_adapter(source)
    is_ready, missing = adapter.is_configured() if adapter else (False, ["No Adapter"])
    return SourceResponse(
        id=source.id,
        name=source.name,
        type=source.type,
        enabled=source.enabled,
        interval_hours=source.interval_hours,
        config=source.config,
        last_run_at=source.last_run_at,
        last_error=source.last_error,
        needs_config=not is_ready,
        missing_env_keys=missing,
    )


@router.post("/{source_id}/run", response_model=IngestionRunResponse)
async def run_single_source(source_id: str, db: Session = Depends(get_db)):
    """Manually trigger an immediate ingestion run for a single source."""
    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found.")

    pipeline = IngestionPipeline(db)
    run = await pipeline.run_source(source)

    return IngestionRunResponse(
        id=run.id,
        source_id=run.source_id,
        source_name=source.name,
        status=run.status,
        started_at=run.started_at,
        finished_at=run.finished_at,
        fetched=run.fetched,
        new=run.new,
        duplicates=run.duplicates,
        errors=run.errors or [],
        tokens_used=run.tokens_used,
    )
