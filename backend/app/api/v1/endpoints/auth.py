from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.schemas.auth import (
    UserRegisterRequest,
    UserLoginRequest,
    AuthResponse,
    UserResponse,
)
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def register(req: UserRegisterRequest, db: Session = Depends(get_db)):
    """Register a new user with email and password."""
    service = AuthService(db)
    user, token = service.register(req)
    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        created_at=user.created_at,
        has_profile=False,
    )
    return AuthResponse(user=user_resp, token=token)


@router.post("/login", response_model=AuthResponse)
def login(req: UserLoginRequest, db: Session = Depends(get_db)):
    """Authenticate existing user and return JWT bearer token."""
    service = AuthService(db)
    user, token = service.authenticate(req)
    has_profile = service.get_current_user_profile_flag(user)
    user_resp = UserResponse(
        id=user.id,
        email=user.email,
        created_at=user.created_at,
        has_profile=has_profile,
    )
    return AuthResponse(user=user_resp, token=token)


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Return currently authenticated user profile summary."""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        created_at=current_user.created_at,
        has_profile=current_user.profile is not None,
    )
