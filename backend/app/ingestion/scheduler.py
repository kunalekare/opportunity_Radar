import asyncio
import random
from typing import Optional
from app.db.session import SessionLocal
from app.models.source import Source
from app.ingestion.pipeline import IngestionPipeline
from app.core.logging import logger

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    APSCHEDULER_AVAILABLE = True
except ImportError:
    APSCHEDULER_AVAILABLE = False


class IngestionScheduler:
    """
    Background scheduler for Opportunity Radar sources using APScheduler.
    Each enabled source runs on its own configured interval with random jitter.
    """
    def __init__(self):
        self.scheduler: Optional[Any] = None
        if APSCHEDULER_AVAILABLE:
            self.scheduler = AsyncIOScheduler()

    def start(self):
        if not APSCHEDULER_AVAILABLE or not self.scheduler:
            logger.warning("[IngestionScheduler] APScheduler not installed; background scheduling disabled.")
            return

        if not self.scheduler.running:
            self.scheduler.start()
            logger.info("[IngestionScheduler] APScheduler started.")
            self.reload_jobs()

    def stop(self):
        if self.scheduler and self.scheduler.running:
            self.scheduler.shutdown(wait=False)
            logger.info("[IngestionScheduler] APScheduler stopped.")

    def reload_jobs(self):
        """Refreshes all scheduled source jobs based on database configuration."""
        if not self.scheduler or not self.scheduler.running:
            return

        self.scheduler.remove_all_jobs()
        db = SessionLocal()
        try:
            sources = db.query(Source).filter(Source.enabled == True).all()
            for source in sources:
                interval_hours = max(1, source.interval_hours or 3)
                jitter_seconds = random.randint(30, 300)

                self.scheduler.add_job(
                    self._run_job_wrapper,
                    "interval",
                    hours=interval_hours,
                    jitter=jitter_seconds,
                    args=[source.id],
                    id=f"source_{source.id}",
                    name=f"Ingestion for {source.name}",
                    replace_existing=True,
                )
                logger.info(
                    f"[IngestionScheduler] Scheduled source '{source.name}' every {interval_hours}h (jitter={jitter_seconds}s)"
                )
        except Exception as e:
            logger.error(f"[IngestionScheduler] Failed reloading jobs: {e}")
        finally:
            db.close()

    @staticmethod
    async def _run_job_wrapper(source_id: str):
        """Asynchronous execution wrapper for scheduled source run."""
        db = SessionLocal()
        try:
            source = db.query(Source).filter(Source.id == source_id).first()
            if source and source.enabled:
                logger.info(f"[IngestionScheduler] Triggering scheduled run for source: {source.name}")
                pipeline = IngestionPipeline(db)
                await pipeline.run_source(source)
        except Exception as e:
            logger.error(f"[IngestionScheduler] Error executing scheduled job for source {source_id}: {e}")
        finally:
            db.close()


ingestion_scheduler = IngestionScheduler()
