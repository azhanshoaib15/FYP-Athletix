from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.models.models import (
    DietPlan, DietPlanMeal, FoodItem, ProgressRecord
)
from app.schemas.schemas import DietPlanCreate, ProgressRecordCreate


# ── Food Items ─────────────────────────────────────────────────────────────────

async def search_food_items(
    db: AsyncSession,
    query: str = "",
    is_halal: Optional[bool] = None,
    is_vegan: Optional[bool] = None,
    is_pakistani: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[FoodItem]:
    q = select(FoodItem).where(FoodItem.is_active == True)
    if query:
        q = q.where(FoodItem.name.ilike(f"%{query}%"))
    if is_halal is not None:
        q = q.where(FoodItem.is_halal == is_halal)
    if is_vegan is not None:
        q = q.where(FoodItem.is_vegan == is_vegan)
    if is_pakistani is not None:
        q = q.where(FoodItem.is_pakistani_local == is_pakistani)
    result = await db.execute(q.offset(skip).limit(limit))
    return result.scalars().all()


# ── Diet Plans ─────────────────────────────────────────────────────────────────

async def get_user_diet_plans(db: AsyncSession, user_id: int) -> List[DietPlan]:
    result = await db.execute(
        select(DietPlan)
        .where(DietPlan.user_id == user_id)
        .options(selectinload(DietPlan.meals))
        .order_by(DietPlan.created_at.desc())
    )
    return result.scalars().all()


async def get_active_diet_plan(db: AsyncSession, user_id: int) -> Optional[DietPlan]:
    result = await db.execute(
        select(DietPlan)
        .where(DietPlan.user_id == user_id, DietPlan.is_active == True)
        .options(selectinload(DietPlan.meals))
    )
    return result.scalar_one_or_none()


async def create_diet_plan(
    db: AsyncSession, user_id: int, data: DietPlanCreate,
    user_profile=None,
) -> DietPlan:
    # Deactivate existing plans
    await db.execute(
        update(DietPlan).where(DietPlan.user_id == user_id).values(is_active=False)
    )

    # Derive calorie/macro targets from profile if available
    daily_calories = None
    protein_g = carbs_g = fat_g = None

    if user_profile:
        daily_calories = user_profile.daily_calorie_target
        protein_g = user_profile.protein_target_g
        carbs_g = user_profile.carbs_target_g
        fat_g = user_profile.fat_target_g

    plan = DietPlan(
        user_id=user_id,
        name=data.name or f"{data.diet_type.title()} Plan",
        diet_type=data.diet_type,
        fitness_goal=data.fitness_goal or (user_profile.fitness_goal if user_profile else "general_fitness"),
        duration_days=data.duration_days,
        total_daily_calories=daily_calories,
        daily_protein_g=protein_g,
        daily_carbs_g=carbs_g,
        daily_fat_g=fat_g,
        is_active=True,
        is_ai_generated=False,
    )
    db.add(plan)
    await db.flush()
    return plan


# ── Progress Records ───────────────────────────────────────────────────────────

async def create_progress_record(
    db: AsyncSession, user_id: int, data: ProgressRecordCreate
) -> ProgressRecord:
    record = ProgressRecord(
        user_id=user_id,
        weight_kg=data.weight_kg,
        body_fat_percentage=data.body_fat_percentage,
        notes=data.notes,
    )
    db.add(record)
    await db.flush()
    return record


async def get_progress_history(
    db: AsyncSession, user_id: int, limit: int = 30
) -> List[ProgressRecord]:
    result = await db.execute(
        select(ProgressRecord)
        .where(ProgressRecord.user_id == user_id)
        .order_by(ProgressRecord.recorded_at.desc())
        .limit(limit)
    )
    return result.scalars().all()


async def get_latest_progress(db: AsyncSession, user_id: int) -> Optional[ProgressRecord]:
    result = await db.execute(
        select(ProgressRecord)
        .where(ProgressRecord.user_id == user_id)
        .order_by(ProgressRecord.recorded_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()
