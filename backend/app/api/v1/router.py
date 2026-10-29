from fastapi import APIRouter
from app.api.v1.endpoints import health, auth, profile, onboarding

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(profile.router, prefix="/profile", tags=["Profile"])
api_router.include_router(onboarding.router, prefix="/onboarding", tags=["Onboarding"])
