from typing import Optional, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.repositories.user_repo import UserRepository
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.models.user import User
from app.schemas.auth import UserRegisterRequest, UserLoginRequest, TokenResponse, UserResponse


class AuthService:
    def __init__(self, db: Session):
        self.db = db
        self.user_repo = UserRepository(db)

    def register(self, req: UserRegisterRequest) -> Tuple[User, TokenResponse]:
        existing_user = self.user_repo.get_by_email(req.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email address already exists.",
            )
        hashed_password = get_password_hash(req.password)
        user = self.user_repo.create(email=req.email, password_hash=hashed_password)
        token_str = create_access_token(subject=user.id)
        token = TokenResponse(
            access_token=token_str,
            token_type="bearer",
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        )
        return user, token

    def authenticate(self, req: UserLoginRequest) -> Tuple[User, TokenResponse]:
        user = self.user_repo.get_by_email(req.email)
        if not user or not verify_password(req.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        token_str = create_access_token(subject=user.id)
        token = TokenResponse(
            access_token=token_str,
            token_type="bearer",
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
        )
        return user, token

    def get_current_user_profile_flag(self, user: User) -> bool:
        return user.profile is not None
