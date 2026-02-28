from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload

from app.models.models import (
    WorkoutPlan, WorkoutPlanDay, WorkoutPlanExercise,
    WorkoutSession, SessionExercise, FormAnalysisLog, Exercise
)
from app.schemas.schemas import WorkoutPlanCreate, SessionStart, SessionEnd, FormAnalysisResult


# ── Exercise Library ───────────────────────────────────────────────────────────

async def get_exercises(
    db: AsyncSession,
    muscle_group: Optional[str] = None,
    difficulty: Optional[str] = None,
    equipment: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
) -> List[Exercise]:
    q = select(Exercise).where(Exercise.is_active == True)
    if muscle_group:
        q = q.where(Exercise.muscle_group == muscle_group)
    if difficulty:
        q = q.where(Exercise.difficulty == difficulty)
    result = await db.execute(q.offset(skip).limit(limit))
    return result.scalars().all()


async def get_exercise_by_id(db: AsyncSession, exercise_id: int) -> Optional[Exercise]:
    result = await db.execute(select(Exercise).where(Exercise.id == exercise_id))
    return result.scalar_one_or_none()


# ── Workout Plans ──────────────────────────────────────────────────────────────

async def get_user_plans(db: AsyncSession, user_id: int) -> List[WorkoutPlan]:
    result = await db.execute(
        select(WorkoutPlan)
        .where(WorkoutPlan.user_id == user_id)
        .options(
            selectinload(WorkoutPlan.days).selectinload(WorkoutPlanDay.exercises)
            .selectinload(WorkoutPlanExercise.exercise)
        )
        .order_by(WorkoutPlan.created_at.desc())
    )
    return result.scalars().all()


async def get_active_plan(db: AsyncSession, user_id: int) -> Optional[WorkoutPlan]:
    result = await db.execute(
        select(WorkoutPlan)
        .where(WorkoutPlan.user_id == user_id, WorkoutPlan.is_active == True)
        .options(
            selectinload(WorkoutPlan.days).selectinload(WorkoutPlanDay.exercises)
            .selectinload(WorkoutPlanExercise.exercise)
        )
    )
    return result.scalar_one_or_none()


async def create_workout_plan(
    db: AsyncSession, user_id: int, data: WorkoutPlanCreate
) -> WorkoutPlan:
    # Deactivate existing plans
    await db.execute(
        update(WorkoutPlan)
        .where(WorkoutPlan.user_id == user_id)
        .values(is_active=False)
    )

    plan = WorkoutPlan(
        user_id=user_id,
        name=data.name,
        description=data.description,
        fitness_goal=data.fitness_goal,
        difficulty=data.difficulty,
        duration_weeks=data.duration_weeks,
        days_per_week=data.days_per_week,
        is_active=True,
        is_ai_generated=False,
    )
    db.add(plan)
    await db.flush()
    return plan


# ── Workout Sessions ───────────────────────────────────────────────────────────

async def start_session(
    db: AsyncSession, user_id: int, data: SessionStart
) -> WorkoutSession:
    session = WorkoutSession(
        user_id=user_id,
        plan_id=data.plan_id,
        plan_day_id=data.plan_day_id,
    )
    db.add(session)
    await db.flush()
    return session


async def end_session(
    db: AsyncSession, session_id: int, user_id: int, data: SessionEnd
) -> Optional[WorkoutSession]:
    from datetime import datetime, timezone
    result = await db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.id == session_id, WorkoutSession.user_id == user_id)
        .options(selectinload(WorkoutSession.exercises))
    )
    session = result.scalar_one_or_none()
    if not session:
        return None

    now = datetime.now(timezone.utc)
    session.ended_at = now
    if session.started_at:
        diff = now - session.started_at
        session.duration_minutes = int(diff.total_seconds() / 60)

    if data.total_calories_burned:
        session.total_calories_burned = data.total_calories_burned
    if data.notes:
        session.notes = data.notes
    if data.user_rating:
        session.user_rating = data.user_rating
    if data.fatigue_level:
        session.fatigue_level = data.fatigue_level

    # Calculate avg form score from form logs
    all_scores = []
    for ex in session.exercises:
        if ex.avg_form_score is not None:
            all_scores.append(ex.avg_form_score)
    if all_scores:
        session.overall_form_score = round(sum(all_scores) / len(all_scores), 2)

    await db.flush()
    return session


async def get_user_sessions(
    db: AsyncSession, user_id: int, skip: int = 0, limit: int = 20
) -> List[WorkoutSession]:
    result = await db.execute(
        select(WorkoutSession)
        .where(WorkoutSession.user_id == user_id)
        .order_by(WorkoutSession.started_at.desc())
        .offset(skip).limit(limit)
    )
    return result.scalars().all()


# ── Form Analysis ──────────────────────────────────────────────────────────────

async def log_form_result(
    db: AsyncSession, user_id: int, data: FormAnalysisResult
) -> FormAnalysisLog:
    log = FormAnalysisLog(
        session_exercise_id=data.session_exercise_id,
        exercise_id=data.exercise_id,
        user_id=user_id,
        rep_number=data.rep_number,
        form_status=data.form_status,
        confidence_score=data.confidence_score,
        errors_detected=data.errors_detected,
        joint_angles=data.joint_angles,
        feedback_given=data.feedback_given,
        keypoints_snapshot=data.keypoints_snapshot,
    )
    db.add(log)

    # Update avg form score on session_exercise
    result = await db.execute(
        select(SessionExercise).where(SessionExercise.id == data.session_exercise_id)
    )
    session_ex = result.scalar_one_or_none()
    if session_ex:
        score = 100.0 if data.form_status == "correct" else (50.0 if data.form_status == "partial" else 0.0)
        if session_ex.avg_form_score is None:
            session_ex.avg_form_score = score
        else:
            # Rolling average
            session_ex.avg_form_score = round(
                (session_ex.avg_form_score + score) / 2, 2
            )

    await db.flush()
    return log


async def get_form_history(
    db: AsyncSession, user_id: int, exercise_id: int, limit: int = 50
) -> List[FormAnalysisLog]:
    result = await db.execute(
        select(FormAnalysisLog)
        .where(
            FormAnalysisLog.user_id == user_id,
            FormAnalysisLog.exercise_id == exercise_id,
        )
        .order_by(FormAnalysisLog.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()
