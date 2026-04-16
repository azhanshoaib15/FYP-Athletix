from typing import Optional
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.models.models import User, UserProfile
from app.schemas.user_schemas import UserRegister, UserProfileCreate
from app.core.security import hash_password


async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    result = await db.execute(
        select(User).where(User.id == user_id).options(selectinload(User.profile))
    )
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str) -> Optional[User]:
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, data: UserRegister) -> User:
    user = User(
        email=data.email,
        username=data.username,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    await db.flush()  # get id without committing

    # Auto-create empty profile
    profile = UserProfile(user_id=user.id)
    db.add(profile)
    await db.flush()

    return user


async def update_last_login(db: AsyncSession, user: User) -> None:
    user.last_login = datetime.now(timezone.utc)
    await db.flush()


async def get_profile(db: AsyncSession, user_id: int) -> Optional[UserProfile]:
    result = await db.execute(
        select(UserProfile).where(UserProfile.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def upsert_profile(
    db: AsyncSession, user_id: int, data: UserProfileCreate
) -> UserProfile:
    profile = await get_profile(db, user_id)
    if not profile:
        profile = UserProfile(user_id=user_id)
        db.add(profile)

    update_data = data.model_dump(exclude_unset=True)

    # Auto-calculate macro targets if calorie goal is provided
    if "daily_calorie_target" in update_data and update_data["daily_calorie_target"]:
        cal = update_data["daily_calorie_target"]
        fitness_goal = update_data.get("fitness_goal") or (profile.fitness_goal or "general_fitness")

        if "muscle_gain" in str(fitness_goal):
            # High protein for muscle gain
            profile.protein_target_g = round((cal * 0.30) / 4, 1)
            profile.carbs_target_g = round((cal * 0.45) / 4, 1)
            profile.fat_target_g = round((cal * 0.25) / 9, 1)
        elif "weight_loss" in str(fitness_goal):
            # High protein, lower carbs for fat loss
            profile.protein_target_g = round((cal * 0.35) / 4, 1)
            profile.carbs_target_g = round((cal * 0.35) / 4, 1)
            profile.fat_target_g = round((cal * 0.30) / 9, 1)
        else:
            # Balanced
            profile.protein_target_g = round((cal * 0.25) / 4, 1)
            profile.carbs_target_g = round((cal * 0.50) / 4, 1)
            profile.fat_target_g = round((cal * 0.25) / 9, 1)

    for field, value in update_data.items():
        setattr(profile, field, value)

    await db.flush()
    return profile
