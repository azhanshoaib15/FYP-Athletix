"""
Auth Routes: /api/v1/auth/
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.security import (
    verify_password, create_access_token, create_refresh_token,
    decode_token, get_current_user, ACCESS_TOKEN_EXPIRE_MINUTES_SECS
)
from app.core.config import settings
from app.schemas.user_schemas import UserRegister, UserLogin, TokenResponse, RefreshTokenRequest, UserOut
from app.services.user_service import (
    create_user, get_user_by_email, get_user_by_username, update_last_login
)

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    """Register a new Athletix user."""
    if await get_user_by_email(db, data.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if await get_user_by_username(db, data.username):
        raise HTTPException(status_code=400, detail="Username already taken")
    user = await create_user(db, data)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login and receive JWT access + refresh tokens."""
    user = await get_user_by_email(db, data.email)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated")

    await update_last_login(db, user)

    token_data = {"sub": str(user.id), "email": user.email}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(data: RefreshTokenRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a refresh token for a new access token."""
    from app.services.user_service import get_user_by_id
    payload = decode_token(data.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = await get_user_by_id(db, int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    token_data = {"sub": str(user.id), "email": user.email}
    return TokenResponse(
        access_token=create_access_token(token_data),
        refresh_token=create_refresh_token(token_data),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=UserOut)
async def get_me(current_user=Depends(get_current_user)):
    """Get the currently authenticated user."""
    return current_user
