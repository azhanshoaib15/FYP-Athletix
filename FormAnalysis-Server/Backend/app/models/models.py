"""
Athletix Database Models
========================
Tables:
  users               → auth credentials
  user_profiles       → body attributes & fitness goals
  exercises           → exercise library
  workout_plans       → AI-generated workout plans
  workout_plan_days   → day-by-day breakdown of a plan
  workout_sessions    → completed workouts by user
  session_exercises   → exercises done in a session
  form_analysis_logs  → XGBoost form analysis results per rep
  food_items          → nutrition database (from USDA)
  diet_plans          → AI-generated diet plans
  diet_plan_meals     → individual meals within a diet plan
  progress_records    → weekly/daily progress snapshots
  chat_sessions       → AI trainer conversations
  chat_messages       → individual messages in a chat session
"""

from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import (
    BigInteger, Boolean, Column, DateTime, Enum, Float,
    ForeignKey, Integer, Numeric, String, Text, JSON,
    UniqueConstraint, Index,
)
from sqlalchemy.orm import relationship
from app.db.session import Base


def now_utc():
    return datetime.now(timezone.utc)


# ─── Enums ─────────────────────────────────────────────────────────────────────

class GenderEnum(str, PyEnum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    PREFER_NOT_TO_SAY = "prefer_not_to_say"


class FitnessGoalEnum(str, PyEnum):
    WEIGHT_LOSS = "weight_loss"
    MUSCLE_GAIN = "muscle_gain"
    ENDURANCE = "endurance"
    FLEXIBILITY = "flexibility"
    GENERAL_FITNESS = "general_fitness"
    ATHLETIC_PERFORMANCE = "athletic_performance"


class FitnessLevelEnum(str, PyEnum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class DietTypeEnum(str, PyEnum):
    STANDARD = "standard"
    HALAL = "halal"
    VEGAN = "vegan"
    VEGETARIAN = "vegetarian"
    KETO = "keto"
    PALEO = "paleo"


class MuscleGroupEnum(str, PyEnum):
    CHEST = "chest"
    BACK = "back"
    SHOULDERS = "shoulders"
    BICEPS = "biceps"
    TRICEPS = "triceps"
    LEGS = "legs"
    GLUTES = "glutes"
    CORE = "core"
    FULL_BODY = "full_body"
    CARDIO = "cardio"


class DifficultyEnum(str, PyEnum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class FormStatusEnum(str, PyEnum):
    CORRECT = "correct"
    INCORRECT = "incorrect"
    PARTIAL = "partial"


class MealTypeEnum(str, PyEnum):
    BREAKFAST = "breakfast"
    LUNCH = "lunch"
    DINNER = "dinner"
    SNACK = "snack"
    PRE_WORKOUT = "pre_workout"
    POST_WORKOUT = "post_workout"


class MessageRoleEnum(str, PyEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"


# ─── User ──────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)
    last_login = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    profile = relationship("UserProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    workout_plans = relationship("WorkoutPlan", back_populates="user", cascade="all, delete-orphan")
    workout_sessions = relationship("WorkoutSession", back_populates="user", cascade="all, delete-orphan")
    diet_plans = relationship("DietPlan", back_populates="user", cascade="all, delete-orphan")
    progress_records = relationship("ProgressRecord", back_populates="user", cascade="all, delete-orphan")
    chat_sessions = relationship("ChatSession", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User id={self.id} email={self.email}>"


# ─── User Profile ──────────────────────────────────────────────────────────────

class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)

    # Personal info
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    gender = Column(Enum(GenderEnum), nullable=True)
    date_of_birth = Column(DateTime(timezone=True), nullable=True)

    # Body attributes (critical for form analysis personalization)
    height_cm = Column(Float, nullable=True)          # cm
    weight_kg = Column(Float, nullable=True)          # kg
    arm_length_cm = Column(Float, nullable=True)      # for biomechanics adjustments
    leg_length_cm = Column(Float, nullable=True)      # for squat/lunge calibration
    shoulder_width_cm = Column(Float, nullable=True)  # for press form
    body_fat_percentage = Column(Float, nullable=True)

    # Fitness info
    fitness_goal = Column(Enum(FitnessGoalEnum), default=FitnessGoalEnum.GENERAL_FITNESS, nullable=True)
    fitness_level = Column(Enum(FitnessLevelEnum), default=FitnessLevelEnum.BEGINNER, nullable=True)
    weekly_workout_days = Column(Integer, default=3, nullable=True)  # how many days/week
    workout_duration_minutes = Column(Integer, default=45, nullable=True)

    # Diet & health
    diet_type = Column(Enum(DietTypeEnum), default=DietTypeEnum.STANDARD, nullable=True)
    daily_calorie_target = Column(Integer, nullable=True)
    protein_target_g = Column(Float, nullable=True)
    carbs_target_g = Column(Float, nullable=True)
    fat_target_g = Column(Float, nullable=True)
    medical_conditions = Column(JSON, default=list)   # e.g. ["diabetes", "hypertension"]
    allergies = Column(JSON, default=list)            # e.g. ["peanuts", "lactose"]
    equipment_available = Column(JSON, default=list)  # e.g. ["dumbbells", "barbell"]

    # Location/culture
    country = Column(String(100), nullable=True)
    profile_picture_url = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    # Relationships
    user = relationship("User", back_populates="profile")

    def __repr__(self):
        return f"<UserProfile user_id={self.user_id} goal={self.fitness_goal}>"


# ─── Exercise Library ──────────────────────────────────────────────────────────

class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    name = Column(String(200), nullable=False, unique=True)
    slug = Column(String(200), nullable=False, unique=True, index=True)
    description = Column(Text, nullable=True)
    instructions = Column(JSON, default=list)          # step-by-step list
    muscle_group = Column(Enum(MuscleGroupEnum), nullable=False)
    secondary_muscles = Column(JSON, default=list)     # list of muscle strings
    difficulty = Column(Enum(DifficultyEnum), nullable=False)
    equipment_needed = Column(JSON, default=list)      # ["barbell", "bench"]
    is_bodyweight = Column(Boolean, default=False)
    calories_per_minute = Column(Float, nullable=True) # avg burn rate
    video_url = Column(String(500), nullable=True)
    thumbnail_url = Column(String(500), nullable=True)
    # XGBoost model filename for this exercise (e.g. "pushup_xgb.json")
    form_model_file = Column(String(200), nullable=True)
    # Biomechanics rules (JSON config used by form analyzer)
    biomechanics_rules = Column(JSON, default=dict)
    # Common form errors to watch for
    common_errors = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    # Relationships
    plan_exercises = relationship("WorkoutPlanExercise", back_populates="exercise")
    session_exercises = relationship("SessionExercise", back_populates="exercise")
    form_logs = relationship("FormAnalysisLog", back_populates="exercise")

    __table_args__ = (
        Index("ix_exercises_muscle_difficulty", "muscle_group", "difficulty"),
    )

    def __repr__(self):
        return f"<Exercise name={self.name} muscle={self.muscle_group}>"


# ─── Workout Plans ─────────────────────────────────────────────────────────────

class WorkoutPlan(Base):
    __tablename__ = "workout_plans"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    fitness_goal = Column(Enum(FitnessGoalEnum), nullable=False)
    difficulty = Column(Enum(DifficultyEnum), nullable=False)
    duration_weeks = Column(Integer, nullable=False)     # total plan length
    days_per_week = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)            # current active plan
    is_ai_generated = Column(Boolean, default=True)
    ai_metadata = Column(JSON, default=dict)             # stores RL context/bandit state
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    # Relationships
    user = relationship("User", back_populates="workout_plans")
    days = relationship("WorkoutPlanDay", back_populates="plan", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<WorkoutPlan id={self.id} user={self.user_id} goal={self.fitness_goal}>"


class WorkoutPlanDay(Base):
    __tablename__ = "workout_plan_days"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    plan_id = Column(BigInteger, ForeignKey("workout_plans.id", ondelete="CASCADE"), nullable=False)
    day_number = Column(Integer, nullable=False)         # 1-7
    week_number = Column(Integer, nullable=False, default=1)
    name = Column(String(100), nullable=True)            # e.g. "Push Day", "Rest"
    is_rest_day = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)

    # Relationships
    plan = relationship("WorkoutPlan", back_populates="days")
    exercises = relationship("WorkoutPlanExercise", back_populates="day", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("plan_id", "week_number", "day_number", name="uq_plan_week_day"),
    )


class WorkoutPlanExercise(Base):
    __tablename__ = "workout_plan_exercises"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    day_id = Column(BigInteger, ForeignKey("workout_plan_days.id", ondelete="CASCADE"), nullable=False)
    exercise_id = Column(BigInteger, ForeignKey("exercises.id"), nullable=False)
    order_index = Column(Integer, nullable=False, default=0)  # display order
    sets = Column(Integer, nullable=False, default=3)
    reps = Column(Integer, nullable=True)                # None = duration-based
    duration_seconds = Column(Integer, nullable=True)
    rest_seconds = Column(Integer, default=60)
    weight_kg = Column(Float, nullable=True)             # recommended weight
    notes = Column(Text, nullable=True)

    # Relationships
    day = relationship("WorkoutPlanDay", back_populates="exercises")
    exercise = relationship("Exercise", back_populates="plan_exercises")


# ─── Workout Sessions (Completed Workouts) ─────────────────────────────────────

class WorkoutSession(Base):
    __tablename__ = "workout_sessions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    plan_id = Column(BigInteger, ForeignKey("workout_plans.id"), nullable=True)   # optional link
    plan_day_id = Column(BigInteger, ForeignKey("workout_plan_days.id"), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=False, default=now_utc)
    ended_at = Column(DateTime(timezone=True), nullable=True)
    duration_minutes = Column(Integer, nullable=True)
    total_calories_burned = Column(Float, nullable=True)
    overall_form_score = Column(Float, nullable=True)    # avg form score 0-100
    notes = Column(Text, nullable=True)
    user_rating = Column(Integer, nullable=True)         # 1-5 stars
    fatigue_level = Column(Integer, nullable=True)       # 1-10 (used by RL bandit)

    # Relationships
    user = relationship("User", back_populates="workout_sessions")
    exercises = relationship("SessionExercise", back_populates="session", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_workout_sessions_user_date", "user_id", "started_at"),
    )


class SessionExercise(Base):
    __tablename__ = "session_exercises"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(BigInteger, ForeignKey("workout_sessions.id", ondelete="CASCADE"), nullable=False)
    exercise_id = Column(BigInteger, ForeignKey("exercises.id"), nullable=False)
    sets_completed = Column(Integer, default=0)
    reps_completed = Column(JSON, default=list)          # [10, 10, 8] per set
    weight_used_kg = Column(JSON, default=list)          # [20.0, 20.0, 22.5] per set
    duration_seconds = Column(Integer, nullable=True)
    calories_burned = Column(Float, nullable=True)
    avg_form_score = Column(Float, nullable=True)        # 0-100

    # Relationships
    session = relationship("WorkoutSession", back_populates="exercises")
    exercise = relationship("Exercise", back_populates="session_exercises")
    form_logs = relationship("FormAnalysisLog", back_populates="session_exercise", cascade="all, delete-orphan")


# ─── Form Analysis Logs ────────────────────────────────────────────────────────

class FormAnalysisLog(Base):
    """
    Stores results from XGBoost form classifier per rep.
    This is the output of your MediaPipe → XGBoost pipeline.
    """
    __tablename__ = "form_analysis_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_exercise_id = Column(BigInteger, ForeignKey("session_exercises.id", ondelete="CASCADE"), nullable=False)
    exercise_id = Column(BigInteger, ForeignKey("exercises.id"), nullable=False)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rep_number = Column(Integer, nullable=False)
    form_status = Column(Enum(FormStatusEnum), nullable=False)
    confidence_score = Column(Float, nullable=False)      # model confidence 0-1
    # Specific errors detected e.g. ["knees caving in", "back not straight"]
    errors_detected = Column(JSON, default=list)
    # Raw keypoint data snapshot (33 landmarks from MediaPipe)
    keypoints_snapshot = Column(JSON, nullable=True)
    # Joint angles at fault position
    joint_angles = Column(JSON, default=dict)             # {"knee": 145, "hip": 90}
    feedback_given = Column(Text, nullable=True)          # human-readable feedback shown
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    # Relationships
    session_exercise = relationship("SessionExercise", back_populates="form_logs")
    exercise = relationship("Exercise", back_populates="form_logs")

    __table_args__ = (
        Index("ix_form_logs_user_exercise", "user_id", "exercise_id"),
    )


# ─── Food Items (Nutrition DB) ─────────────────────────────────────────────────

class FoodItem(Base):
    """
    Populated from USDA FoodData Central.
    Foundation + Branded foods with cultural flags.
    """
    __tablename__ = "food_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    usda_fdc_id = Column(Integer, unique=True, nullable=True, index=True)  # USDA reference
    name = Column(String(300), nullable=False)
    brand = Column(String(200), nullable=True)
    category = Column(String(100), nullable=True)

    # Macros per 100g
    calories_per_100g = Column(Float, nullable=True)
    protein_g = Column(Float, nullable=True)
    carbs_g = Column(Float, nullable=True)
    fat_g = Column(Float, nullable=True)
    fiber_g = Column(Float, nullable=True)
    sugar_g = Column(Float, nullable=True)
    sodium_mg = Column(Float, nullable=True)

    # Micros per 100g (for medical conditions)
    calcium_mg = Column(Float, nullable=True)
    iron_mg = Column(Float, nullable=True)
    vitamin_c_mg = Column(Float, nullable=True)
    vitamin_d_mcg = Column(Float, nullable=True)

    # Cultural/diet flags (critical for Athletix)
    is_halal = Column(Boolean, nullable=True)
    is_vegan = Column(Boolean, nullable=True)
    is_vegetarian = Column(Boolean, nullable=True)
    is_keto_friendly = Column(Boolean, nullable=True)
    is_pakistani_local = Column(Boolean, default=False)  # local Pakistani foods
    common_allergens = Column(JSON, default=list)         # ["gluten", "dairy"]

    # Serving info
    serving_size_g = Column(Float, nullable=True)
    serving_description = Column(String(100), nullable=True)  # "1 cup", "1 piece"

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    __table_args__ = (
        Index("ix_food_items_category_halal", "category", "is_halal"),
        Index("ix_food_items_name", "name"),
    )

    def __repr__(self):
        return f"<FoodItem name={self.name} cal={self.calories_per_100g}>"


# ─── Diet Plans ────────────────────────────────────────────────────────────────

class DietPlan(Base):
    __tablename__ = "diet_plans"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    diet_type = Column(Enum(DietTypeEnum), nullable=False)
    fitness_goal = Column(Enum(FitnessGoalEnum), nullable=False)
    duration_days = Column(Integer, nullable=False, default=7)
    total_daily_calories = Column(Integer, nullable=True)
    daily_protein_g = Column(Float, nullable=True)
    daily_carbs_g = Column(Float, nullable=True)
    daily_fat_g = Column(Float, nullable=True)
    is_active = Column(Boolean, default=True)
    is_ai_generated = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    # Relationships
    user = relationship("User", back_populates="diet_plans")
    meals = relationship("DietPlanMeal", back_populates="diet_plan", cascade="all, delete-orphan")


class DietPlanMeal(Base):
    __tablename__ = "diet_plan_meals"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    diet_plan_id = Column(BigInteger, ForeignKey("diet_plans.id", ondelete="CASCADE"), nullable=False)
    day_number = Column(Integer, nullable=False)         # 1-7
    meal_type = Column(Enum(MealTypeEnum), nullable=False)
    name = Column(String(200), nullable=False)            # e.g. "Chana Daal with Rice"
    description = Column(Text, nullable=True)
    total_calories = Column(Float, nullable=True)
    total_protein_g = Column(Float, nullable=True)
    total_carbs_g = Column(Float, nullable=True)
    total_fat_g = Column(Float, nullable=True)

    # Relationships
    diet_plan = relationship("DietPlan", back_populates="meals")
    food_items = relationship("MealFoodItem", back_populates="meal", cascade="all, delete-orphan")


class MealFoodItem(Base):
    """Junction: links a meal to specific food items with portion sizes."""
    __tablename__ = "meal_food_items"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    meal_id = Column(BigInteger, ForeignKey("diet_plan_meals.id", ondelete="CASCADE"), nullable=False)
    food_item_id = Column(BigInteger, ForeignKey("food_items.id"), nullable=False)
    quantity_g = Column(Float, nullable=False)            # grams used
    # Computed at insertion for quick reads
    calories = Column(Float, nullable=True)
    protein_g = Column(Float, nullable=True)
    carbs_g = Column(Float, nullable=True)
    fat_g = Column(Float, nullable=True)

    # Relationships
    meal = relationship("DietPlanMeal", back_populates="food_items")
    food_item = relationship("FoodItem")


# ─── Progress Records ──────────────────────────────────────────────────────────

class ProgressRecord(Base):
    """
    Weekly/daily snapshots of user fitness metrics.
    Powers the gamified dashboard and RL bandit context.
    """
    __tablename__ = "progress_records"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    recorded_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    # Body metrics
    weight_kg = Column(Float, nullable=True)
    body_fat_percentage = Column(Float, nullable=True)

    # Weekly workout stats
    workouts_completed = Column(Integer, default=0)
    total_workout_minutes = Column(Integer, default=0)
    total_calories_burned = Column(Float, default=0)
    avg_form_score = Column(Float, nullable=True)      # avg across week

    # Nutrition adherence
    avg_daily_calories = Column(Float, nullable=True)
    diet_adherence_pct = Column(Float, nullable=True)  # % of days followed plan

    # Gamification
    streak_days = Column(Integer, default=0)           # consecutive workout days
    badges_earned = Column(JSON, default=list)         # ["first_workout", "week_streak"]
    xp_points = Column(Integer, default=0)

    # Notes
    notes = Column(Text, nullable=True)

    user = relationship("User", back_populates="progress_records")

    __table_args__ = (
        Index("ix_progress_user_date", "user_id", "recorded_at"),
    )


# ─── AI Trainer Chat ───────────────────────────────────────────────────────────

class ChatSession(Base):
    """
    Groups messages for a single conversation with the RAG-powered AI Trainer.
    """
    __tablename__ = "chat_sessions"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(200), nullable=True)          # auto-summarized from first message
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc, nullable=False)

    # Relationships
    user = relationship("User", back_populates="chat_sessions")
    messages = relationship("ChatMessage", back_populates="session", cascade="all, delete-orphan")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    session_id = Column(BigInteger, ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(Enum(MessageRoleEnum), nullable=False)
    content = Column(Text, nullable=False)
    # RAG metadata: which documents were retrieved
    retrieved_sources = Column(JSON, default=list)
    # Token usage for cost tracking
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc, nullable=False)

    session = relationship("ChatSession", back_populates="messages")

    __table_args__ = (
        Index("ix_chat_messages_session_created", "session_id", "created_at"),
    )
