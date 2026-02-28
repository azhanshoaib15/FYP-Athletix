"""
Diet Routes: /api/v1/diet/
Progress Routes: /api/v1/progress/
"""
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.security import get_current_user
from app.schemas.schemas import (
    DietPlanCreate, DietPlanOut, FoodItemOut,
    ProgressRecordCreate, ProgressRecordOut
)
from app.services.diet_service import (
    search_food_items, get_user_diet_plans, get_active_diet_plan,
    create_diet_plan, create_progress_record, get_progress_history, get_latest_progress
)
from app.services.user_service import get_profile

diet_router = APIRouter(prefix="/diet", tags=["Diet & Nutrition"])
progress_router = APIRouter(prefix="/progress", tags=["Progress Tracking"])


# ── Food Database ──────────────────────────────────────────────────────────────

@diet_router.get("/foods", response_model=list[FoodItemOut])
async def search_foods(
    q: str = Query("", description="Search by food name"),
    is_halal: Optional[bool] = Query(None),
    is_vegan: Optional[bool] = Query(None),
    is_pakistani: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Search the USDA + local food database with cultural filters."""
    return await search_food_items(db, q, is_halal, is_vegan, is_pakistani, skip, limit)


# ── Diet Plans ─────────────────────────────────────────────────────────────────

@diet_router.get("/plans", response_model=list[DietPlanOut])
async def list_diet_plans(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await get_user_diet_plans(db, current_user.id)


@diet_router.get("/plans/active", response_model=DietPlanOut)
async def get_active_plan(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from fastapi import HTTPException
    plan = await get_active_diet_plan(db, current_user.id)
    if not plan:
        raise HTTPException(status_code=404, detail="No active diet plan found")
    return plan


@diet_router.post("/plans", response_model=DietPlanOut, status_code=201)
async def create_new_diet_plan(
    data: DietPlanCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a diet plan. Macro targets are pulled from your profile automatically.
    AI-powered meal generation endpoint coming in Phase 2.
    """
    profile = await get_profile(db, current_user.id)
    return await create_diet_plan(db, current_user.id, data, profile)


# ── Progress Tracking ──────────────────────────────────────────────────────────

@progress_router.post("/", response_model=ProgressRecordOut, status_code=201)
async def log_progress(
    data: ProgressRecordCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Log today's body metrics (weight, body fat %). Workout stats auto-aggregate."""
    return await create_progress_record(db, current_user.id, data)


@progress_router.get("/", response_model=list[ProgressRecordOut])
async def get_progress(
    limit: int = Query(30, le=100),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get progress history for dashboard charts."""
    return await get_progress_history(db, current_user.id, limit)


@progress_router.get("/latest", response_model=ProgressRecordOut)
async def get_latest(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from fastapi import HTTPException
    record = await get_latest_progress(db, current_user.id)
    if not record:
        raise HTTPException(status_code=404, detail="No progress records yet")
    return record
