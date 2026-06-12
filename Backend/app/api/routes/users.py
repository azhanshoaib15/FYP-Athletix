"""
User Profile Routes: /api/v1/users/
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.security import get_current_user
from app.schemas.user_schemas import UserProfileCreate, UserProfileOut, UserWithProfile
from app.services.user_service import upsert_profile, get_profile

router = APIRouter(prefix="/users", tags=["User Profile"])


@router.get("/me/profile", response_model=UserProfileOut)
async def get_my_profile(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get my full fitness profile including body attributes."""
    profile = await get_profile(db, current_user.id)
    if not profile:
        from app.models.models import UserProfile
        profile = UserProfile(user_id=current_user.id)
        db.add(profile)
        await db.flush()
    return profile


@router.put("/me/profile", response_model=UserProfileOut)
async def update_my_profile(
    data: UserProfileCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update body attributes, fitness goals, diet preferences.
    Macro targets (protein/carbs/fat) are auto-calculated from calorie goal.
    """
    profile = await upsert_profile(db, current_user.id, data)
    return profile
