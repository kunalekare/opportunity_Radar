from typing import Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.repositories.profile_repo import ProfileRepository
from app.models.profile import Profile
from app.schemas.profile import ProfileCreate, ProfileUpdate


class ProfileService:
    def __init__(self, db: Session):
        self.db = db
        self.profile_repo = ProfileRepository(db)

    def get_user_profile(self, user_id: str) -> Optional[Profile]:
        return self.profile_repo.get_by_user_id(user_id)

    def create_or_update_profile(self, user_id: str, profile_in: ProfileCreate) -> Profile:
        existing = self.profile_repo.get_by_user_id(user_id)
        if existing:
            update_data = ProfileUpdate(**profile_in.model_dump())
            return self.profile_repo.update(existing, update_data)
        return self.profile_repo.create(user_id, profile_in)

    def update_profile(self, user_id: str, profile_in: ProfileUpdate) -> Profile:
        existing = self.profile_repo.get_by_user_id(user_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found for current user. Please complete onboarding first.",
            )
        return self.profile_repo.update(existing, profile_in)
