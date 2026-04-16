"""
Workout Routes: /api/v1/workouts/
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.core.security import get_current_user
from app.schemas.schemas import (
    WorkoutPlanCreate, WorkoutPlanOut, WorkoutSessionOut,
    SessionStart, SessionEnd, FormAnalysisResult, FormAnalysisOut, ExerciseOut
)
from app.services.workout_service import (
    get_exercises, get_exercise_by_id, get_user_plans, get_active_plan,
    create_workout_plan, start_session, end_session,
    get_user_sessions, log_form_result, get_form_history
)

router = APIRouter(prefix="/workouts", tags=["Workouts"])


# ── Exercise Library ───────────────────────────────────────────────────────────

@router.get("/exercises", response_model=list[ExerciseOut])
async def list_exercises(
    muscle_group: Optional[str] = Query(None),
    difficulty: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=100),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """Browse the exercise library, optionally filtered by muscle group or difficulty."""
    return await get_exercises(db, muscle_group, difficulty, skip=skip, limit=limit)


@router.get("/exercises/{exercise_id}", response_model=ExerciseOut)
async def get_exercise(
    exercise_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    ex = await get_exercise_by_id(db, exercise_id)
    if not ex:
        raise HTTPException(status_code=404, detail="Exercise not found")
    return ex


# ── Workout Plans ──────────────────────────────────────────────────────────────

@router.get("/plans", response_model=list[WorkoutPlanOut])
async def list_plans(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all workout plans for the current user."""
    return await get_user_plans(db, current_user.id)


@router.get("/plans/active", response_model=WorkoutPlanOut)
async def get_my_active_plan(
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    plan = await get_active_plan(db, current_user.id)
    if not plan:
        raise HTTPException(status_code=404, detail="No active workout plan found")
    return plan


@router.post("/plans", response_model=WorkoutPlanOut, status_code=201)
async def create_plan(
    data: WorkoutPlanCreate,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new workout plan (manual). AI generation endpoint coming in Phase 3."""
    return await create_workout_plan(db, current_user.id, data)


# ── Sessions ───────────────────────────────────────────────────────────────────

@router.post("/sessions/start", response_model=WorkoutSessionOut, status_code=201)
async def start_workout_session(
    data: SessionStart,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Start a live workout session."""
    return await start_session(db, current_user.id, data)


@router.patch("/sessions/{session_id}/end", response_model=WorkoutSessionOut)
async def end_workout_session(
    session_id: int,
    data: SessionEnd,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """End a workout session and save summary stats."""
    session = await end_session(db, session_id, current_user.id, data)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.get("/sessions", response_model=list[WorkoutSessionOut])
async def list_sessions(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, le=100),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get workout session history."""
    return await get_user_sessions(db, current_user.id, skip, limit)


# ── Form Analysis ──────────────────────────────────────────────────────────────

@router.post("/form-analysis", response_model=FormAnalysisOut, status_code=201)
async def submit_form_analysis(
    data: FormAnalysisResult,
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Submit XGBoost form analysis result for a single rep.
    Called by the mobile app after running inference locally with MediaPipe + XGBoost.
    """
    log = await log_form_result(db, current_user.id, data)
    return log


@router.get("/form-analysis/{exercise_id}/history", response_model=list[FormAnalysisOut])
async def form_history(
    exercise_id: int,
    limit: int = Query(50, le=200),
    current_user=Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get form analysis history for a specific exercise to track improvement over time."""
    return await get_form_history(db, current_user.id, exercise_id, limit)
