from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.profile import Profile
from app.schemas.profile import ProfileCreate, ProfileUpdate


class ProfileRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_by_user_id(self, user_id: str) -> Optional[Profile]:
        return self.db.query(Profile).filter(Profile.user_id == user_id).first()

    def get_by_id(self, profile_id: str) -> Optional[Profile]:
        return self.db.query(Profile).filter(Profile.id == profile_id).first()

    def create(self, user_id: str, profile_in: ProfileCreate) -> Profile:
        profile_data = profile_in.model_dump()
        profile = Profile(user_id=user_id, **profile_data)
        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def update(self, profile: Profile, profile_in: ProfileUpdate) -> Profile:
        update_data = profile_in.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(profile, field, value)
        self.db.commit()
        self.db.refresh(profile)
        return profile

    def delete(self, profile: Profile) -> None:
        self.db.delete(profile)
        self.db.commit()
