from datetime import datetime
from pydantic import BaseModel, EmailStr, Field


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in_minutes: int


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    created_at: datetime
    has_profile: bool = False

    class Config:
        from_attributes = True


class AuthResponse(BaseModel):
    user: UserResponse
    token: TokenResponse
