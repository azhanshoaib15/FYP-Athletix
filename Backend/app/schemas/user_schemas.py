from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, field_validator
import re


# ── Auth Schemas ───────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    email: EmailStr
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_valid(cls, v):
        if not re.match(r"^[a-zA-Z0-9_]{3,50}$", v):
            raise ValueError("Username must be 3-50 chars, alphanumeric + underscore only")
        return v

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds


class RefreshTokenRequest(BaseModel):
    refresh_token: str


# ── User Schemas ───────────────────────────────────────────────────────────────

class UserOut(BaseModel):
    id: int
    email: str
    username: str
    is_active: bool
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserWithProfile(UserOut):
    profile: Optional["UserProfileOut"] = None


# ── Profile Schemas ────────────────────────────────────────────────────────────

class UserProfileCreate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    arm_length_cm: Optional[float] = None
    leg_length_cm: Optional[float] = None
    shoulder_width_cm: Optional[float] = None
    body_fat_percentage: Optional[float] = None
    fitness_goal: Optional[str] = None
    fitness_level: Optional[str] = None
    weekly_workout_days: Optional[int] = 3
    workout_duration_minutes: Optional[int] = 45
    diet_type: Optional[str] = None
    daily_calorie_target: Optional[int] = None
    medical_conditions: Optional[list] = []
    allergies: Optional[list] = []
    equipment_available: Optional[list] = []
    country: Optional[str] = None


class UserProfileUpdate(UserProfileCreate):
    pass


class UserProfileOut(UserProfileCreate):
    id: int
    user_id: int
    protein_target_g: Optional[float] = None
    carbs_target_g: Optional[float] = None
    fat_target_g: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


UserWithProfile.model_rebuild()
