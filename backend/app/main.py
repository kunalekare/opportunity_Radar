from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import time
from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.api.v1.router import api_router

# Initialize structured logging
setup_logging(debug=settings.DEBUG)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Opportunity Radar API: Automated internship, job, freelance, and collaboration radar powered by Claude AI.",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Set up CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


@app.middleware("http")
async def add_process_time_and_log(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = f"{process_time:.4f}s"
        logger.info(
            f"{request.method} {request.url.path} responded {response.status_code} in {process_time:.4f}s"
        )
        return response
    except Exception as e:
        process_time = time.time() - start_time
        logger.error(f"Unhandled error processing {request.method} {request.url.path}: {e}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error occurred.", "path": request.url.path},
        )


# Mount API V1 routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": f"{settings.API_V1_STR}/docs",
        "health": f"{settings.API_V1_STR}/health",
    }
