from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel


# ── Exercise Schemas ───────────────────────────────────────────────────────────

class ExerciseOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str]
    muscle_group: str
    difficulty: str
    equipment_needed: list
    is_bodyweight: bool
    calories_per_minute: Optional[float]
    video_url: Optional[str]
    common_errors: list
    instructions: list

    class Config:
        from_attributes = True


# ── Workout Plan Schemas ───────────────────────────────────────────────────────

class WorkoutPlanExerciseOut(BaseModel):
    id: int
    exercise_id: int
    exercise: Optional[ExerciseOut] = None
    order_index: int
    sets: int
    reps: Optional[int]
    duration_seconds: Optional[int]
    rest_seconds: int
    weight_kg: Optional[float]
    notes: Optional[str]

    class Config:
        from_attributes = True


class WorkoutPlanDayOut(BaseModel):
    id: int
    day_number: int
    week_number: int
    name: Optional[str]
    is_rest_day: bool
    exercises: List[WorkoutPlanExerciseOut] = []

    class Config:
        from_attributes = True


class WorkoutPlanOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    fitness_goal: str
    difficulty: str
    duration_weeks: int
    days_per_week: int
    is_active: bool
    is_ai_generated: bool
    created_at: datetime
    days: List[WorkoutPlanDayOut] = []

    class Config:
        from_attributes = True


class WorkoutPlanCreate(BaseModel):
    name: str
    fitness_goal: str
    difficulty: str
    duration_weeks: int = 4
    days_per_week: int = 3
    description: Optional[str] = None


# ── Session Schemas ────────────────────────────────────────────────────────────

class SessionStart(BaseModel):
    plan_id: Optional[int] = None
    plan_day_id: Optional[int] = None


class SessionEnd(BaseModel):
    total_calories_burned: Optional[float] = None
    notes: Optional[str] = None
    user_rating: Optional[int] = None          # 1-5
    fatigue_level: Optional[int] = None        # 1-10


class FormAnalysisResult(BaseModel):
    """Payload from XGBoost form analysis model, sent by mobile app."""
    session_exercise_id: int
    exercise_id: int
    rep_number: int
    form_status: str                           # correct / incorrect / partial
    confidence_score: float
    errors_detected: List[str] = []
    joint_angles: dict = {}
    feedback_given: Optional[str] = None
    keypoints_snapshot: Optional[dict] = None


class FormAnalysisOut(BaseModel):
    id: int
    rep_number: int
    form_status: str
    confidence_score: float
    errors_detected: List[str]
    feedback_given: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class WorkoutSessionOut(BaseModel):
    id: int
    started_at: datetime
    ended_at: Optional[datetime]
    duration_minutes: Optional[int]
    total_calories_burned: Optional[float]
    overall_form_score: Optional[float]
    user_rating: Optional[int]

    class Config:
        from_attributes = True


# ── Diet Schemas ───────────────────────────────────────────────────────────────

class FoodItemOut(BaseModel):
    id: int
    name: str
    category: Optional[str]
    calories_per_100g: Optional[float]
    protein_g: Optional[float]
    carbs_g: Optional[float]
    fat_g: Optional[float]
    is_halal: Optional[bool]
    is_vegan: Optional[bool]
    is_pakistani_local: bool
    serving_size_g: Optional[float]
    serving_description: Optional[str]

    class Config:
        from_attributes = True


class DietPlanMealOut(BaseModel):
    id: int
    day_number: int
    meal_type: str
    name: str
    description: Optional[str]
    total_calories: Optional[float]
    total_protein_g: Optional[float]
    total_carbs_g: Optional[float]
    total_fat_g: Optional[float]

    class Config:
        from_attributes = True


class DietPlanOut(BaseModel):
    id: int
    name: str
    diet_type: str
    fitness_goal: str
    duration_days: int
    total_daily_calories: Optional[int]
    daily_protein_g: Optional[float]
    daily_carbs_g: Optional[float]
    daily_fat_g: Optional[float]
    is_active: bool
    created_at: datetime
    meals: List[DietPlanMealOut] = []

    class Config:
        from_attributes = True


class DietPlanCreate(BaseModel):
    name: Optional[str] = None
    diet_type: str = "standard"
    fitness_goal: Optional[str] = None
    duration_days: int = 7


# ── Progress Schemas ───────────────────────────────────────────────────────────

class ProgressRecordCreate(BaseModel):
    weight_kg: Optional[float] = None
    body_fat_percentage: Optional[float] = None
    notes: Optional[str] = None


class ProgressRecordOut(BaseModel):
    id: int
    recorded_at: datetime
    weight_kg: Optional[float]
    body_fat_percentage: Optional[float]
    workouts_completed: int
    total_workout_minutes: int
    total_calories_burned: float
    avg_form_score: Optional[float]
    streak_days: int
    xp_points: int
    badges_earned: list

    class Config:
        from_attributes = True


# ── Chat Schemas ───────────────────────────────────────────────────────────────

class ChatMessageCreate(BaseModel):
    content: str


class ChatMessageOut(BaseModel):
    id: int
    role: str
    content: str
    retrieved_sources: list
    created_at: datetime

    class Config:
        from_attributes = True


class ChatSessionOut(BaseModel):
    id: int
    title: Optional[str]
    is_active: bool
    created_at: datetime
    messages: List[ChatMessageOut] = []

    class Config:
        from_attributes = True


# ── Common Schemas ─────────────────────────────────────────────────────────────

class APIResponse(BaseModel):
    success: bool = True
    message: str = "OK"
    data: Optional[dict] = None


class PaginatedResponse(BaseModel):
    items: list
    total: int
    page: int
    page_size: int
    pages: int
