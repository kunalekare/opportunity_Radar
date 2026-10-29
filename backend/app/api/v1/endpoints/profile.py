from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.profile import ProfileCreate, ProfileUpdate, ProfileResponse
from app.services.profile_service import ProfileService

router = APIRouter()


@router.get("", response_model=ProfileResponse)
def get_profile(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """Retrieve the Opportunity Radar profile of the authenticated user."""
    service = ProfileService(db)
    profile = service.get_user_profile(current_user.id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No profile created yet for this account.",
        )
    return profile


@router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
def create_profile(
    profile_in: ProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create or overwrite profile for the authenticated user."""
    service = ProfileService(db)
    return service.create_or_update_profile(current_user.id, profile_in)


@router.put("", response_model=ProfileResponse)
def update_profile(
    profile_in: ProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update profile fields for the authenticated user."""
    service = ProfileService(db)
    return service.update_profile(current_user.id, profile_in)
