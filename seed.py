"""
Seed Script: Populate exercises library + Pakistani/USDA food items
Run: python seed.py
"""
import asyncio
from app.db.session import AsyncSessionLocal, engine, Base
from app.models.models import Exercise, FoodItem


EXERCISES = [
    {
        "name": "Push-up", "slug": "push-up",
        "description": "A bodyweight exercise targeting the chest, triceps, and shoulders.",
        "muscle_group": "chest", "difficulty": "beginner", "is_bodyweight": True,
        "equipment_needed": [], "calories_per_minute": 7.0,
        "form_model_file": "pushup_xgb.json",
        "instructions": [
            "Start in a plank position with hands shoulder-width apart.",
            "Lower your chest to just above the floor.",
            "Push back up to starting position.",
            "Keep your core tight throughout."
        ],
        "common_errors": ["Hips sagging", "Elbows flaring out", "Not going low enough"],
        "biomechanics_rules": {"elbow_angle_bottom": {"min": 70, "max": 100}, "hip_alignment": "neutral"},
    },
    {
        "name": "Squat", "slug": "squat",
        "description": "A fundamental lower body compound movement.",
        "muscle_group": "legs", "difficulty": "beginner", "is_bodyweight": True,
        "equipment_needed": [], "calories_per_minute": 8.0,
        "form_model_file": "squat_xgb.json",
        "instructions": [
            "Stand with feet shoulder-width apart, toes slightly out.",
            "Brace your core and keep chest up.",
            "Lower until thighs are parallel to the floor.",
            "Drive through heels to stand back up."
        ],
        "common_errors": ["Knees caving in", "Heels lifting", "Leaning too far forward", "Not reaching parallel"],
        "biomechanics_rules": {"knee_angle_bottom": {"min": 85, "max": 100}, "knee_valgus": False},
    },
    {
        "name": "Bench Press", "slug": "bench-press",
        "description": "Barbell compound movement for chest strength.",
        "muscle_group": "chest", "difficulty": "intermediate", "is_bodyweight": False,
        "equipment_needed": ["barbell", "bench"], "calories_per_minute": 6.0,
        "form_model_file": "BenchPress_xgb.json",
        "instructions": [
            "Lie flat on bench, grip barbell slightly wider than shoulder-width.",
            "Lower bar to mid-chest with control.",
            "Press bar up and slightly back to starting position.",
            "Keep feet flat and back slightly arched."
        ],
        "common_errors": ["Bouncing bar off chest", "Flared elbows", "Lifting feet off floor"],
        "biomechanics_rules": {"elbow_angle_bottom": {"min": 75, "max": 95}},
    },
    {
        "name": "Bicep Curl", "slug": "bicep-curl",
        "description": "Isolation movement for the biceps.",
        "muscle_group": "biceps", "difficulty": "beginner", "is_bodyweight": False,
        "equipment_needed": ["dumbbells"], "calories_per_minute": 4.0,
        "form_model_file": None,
        "instructions": [
            "Stand with dumbbells at your sides, palms forward.",
            "Curl the weights up toward your shoulders.",
            "Squeeze at the top and lower slowly.",
            "Keep elbows pinned to your sides."
        ],
        "common_errors": ["Swinging body", "Using momentum", "Not fully extending"],
        "biomechanics_rules": {"elbow_movement": "minimal"},
    },
    {
        "name": "Lat Pulldown", "slug": "lat-pulldown",
        "description": "Cable machine exercise for back width.",
        "muscle_group": "back", "difficulty": "beginner", "is_bodyweight": False,
        "equipment_needed": ["cable machine"], "calories_per_minute": 5.5,
        "form_model_file": "LatPulldown_xgb.json",
        "instructions": [
            "Sit at lat pulldown machine, grip bar wider than shoulders.",
            "Pull bar down to upper chest while leaning slightly back.",
            "Squeeze shoulder blades together at the bottom.",
            "Slowly return the bar to start."
        ],
        "common_errors": ["Pulling behind the neck", "Using momentum", "Not squeezing lats"],
        "biomechanics_rules": {"pull_angle": "front", "shoulder_depression": True},
    },
    {
        "name": "Tricep Pushdown", "slug": "tricep-pushdown",
        "description": "Cable isolation exercise for triceps.",
        "muscle_group": "triceps", "difficulty": "beginner", "is_bodyweight": False,
        "equipment_needed": ["cable machine"], "calories_per_minute": 4.5,
        "form_model_file": "TricepPushdown_xgb.json",
        "instructions": [
            "Stand at cable machine with rope/bar at chest height.",
            "Keep elbows tucked, push handle down until arms are straight.",
            "Squeeze triceps at full extension.",
            "Return slowly with control."
        ],
        "common_errors": ["Elbows drifting forward", "Using body weight", "Not locking out"],
        "biomechanics_rules": {"elbow_position": "fixed"},
    },
    {
        "name": "Shoulder Press", "slug": "shoulder-press",
        "description": "Overhead pressing movement for deltoids.",
        "muscle_group": "shoulders", "difficulty": "intermediate", "is_bodyweight": False,
        "equipment_needed": ["dumbbells"], "calories_per_minute": 6.0,
        "form_model_file": "ShoulderPress_xgb.json",
        "instructions": [
            "Sit or stand with dumbbells at shoulder height, palms forward.",
            "Press the weights overhead until arms are fully extended.",
            "Lower slowly back to shoulder height.",
            "Keep core braced throughout."
        ],
        "common_errors": ["Arching lower back", "Pressing in front instead of overhead", "Rushing the descent"],
        "biomechanics_rules": {"press_path": "vertical", "lumbar_arch": "neutral"},
    },
    {
        "name": "Plank", "slug": "plank",
        "description": "Isometric core stability exercise.",
        "muscle_group": "core", "difficulty": "beginner", "is_bodyweight": True,
        "equipment_needed": [], "calories_per_minute": 5.0,
        "form_model_file": None,
        "instructions": [
            "Get into forearm plank position, elbows under shoulders.",
            "Keep body in a straight line from head to heels.",
            "Brace your core and hold the position.",
            "Breathe steadily."
        ],
        "common_errors": ["Hips too high or low", "Head drooping", "Holding breath"],
        "biomechanics_rules": {"hip_alignment": "neutral", "spine_neutral": True},
    },
]

FOOD_ITEMS = [
    # Pakistani local foods
    {"name": "Boiled Chickpeas (Chana)", "category": "Legumes", "calories_per_100g": 164, "protein_g": 8.9, "carbs_g": 27.4, "fat_g": 2.6, "fiber_g": 7.6, "is_halal": True, "is_vegan": True, "is_vegetarian": True, "is_pakistani_local": True, "serving_size_g": 150, "serving_description": "1 katori (bowl)"},
    {"name": "Dal Mash (Urad Dal)", "category": "Legumes", "calories_per_100g": 341, "protein_g": 25.2, "carbs_g": 58.9, "fat_g": 1.6, "fiber_g": 18.3, "is_halal": True, "is_vegan": True, "is_vegetarian": True, "is_pakistani_local": True, "serving_size_g": 150, "serving_description": "1 katori cooked"},
    {"name": "Roti (Whole Wheat)", "category": "Grains", "calories_per_100g": 264, "protein_g": 8.7, "carbs_g": 55.3, "fat_g": 1.9, "fiber_g": 7.0, "is_halal": True, "is_vegan": True, "is_vegetarian": True, "is_pakistani_local": True, "serving_size_g": 40, "serving_description": "1 medium roti"},
    {"name": "Chicken Karahi", "category": "Meat Dishes", "calories_per_100g": 185, "protein_g": 22.0, "carbs_g": 4.5, "fat_g": 9.0, "is_halal": True, "is_vegan": False, "is_vegetarian": False, "is_pakistani_local": True, "serving_size_g": 200, "serving_description": "1 serving"},
    {"name": "Dahi (Plain Yogurt)", "category": "Dairy", "calories_per_100g": 61, "protein_g": 3.5, "carbs_g": 4.7, "fat_g": 3.3, "is_halal": True, "is_vegan": False, "is_vegetarian": True, "is_pakistani_local": True, "serving_size_g": 150, "serving_description": "1 cup"},
    {"name": "Saag (Mustard Greens)", "category": "Vegetables", "calories_per_100g": 27, "protein_g": 3.0, "carbs_g": 3.0, "fat_g": 0.5, "fiber_g": 3.2, "is_halal": True, "is_vegan": True, "is_vegetarian": True, "is_pakistani_local": True, "serving_size_g": 200, "serving_description": "1 plate"},
    {"name": "Biryani Rice (Chicken)", "category": "Rice Dishes", "calories_per_100g": 210, "protein_g": 12.0, "carbs_g": 28.0, "fat_g": 6.0, "is_halal": True, "is_vegan": False, "is_vegetarian": False, "is_pakistani_local": True, "serving_size_g": 300, "serving_description": "1 plate"},
    {"name": "Paratha (Butter)", "category": "Grains", "calories_per_100g": 326, "protein_g": 6.5, "carbs_g": 47.5, "fat_g": 13.0, "is_halal": True, "is_vegan": False, "is_vegetarian": True, "is_pakistani_local": True, "serving_size_g": 60, "serving_description": "1 paratha"},
    # Standard/USDA foods
    {"name": "Chicken Breast (Grilled)", "category": "Meat", "calories_per_100g": 165, "protein_g": 31.0, "carbs_g": 0.0, "fat_g": 3.6, "is_halal": None, "is_vegan": False, "is_vegetarian": False, "is_pakistani_local": False, "serving_size_g": 150, "serving_description": "1 medium breast"},
    {"name": "Brown Rice (Cooked)", "category": "Grains", "calories_per_100g": 123, "protein_g": 2.7, "carbs_g": 25.6, "fat_g": 1.0, "fiber_g": 1.8, "is_halal": True, "is_vegan": True, "is_vegetarian": True, "is_pakistani_local": False, "serving_size_g": 185, "serving_description": "1 cup cooked"},
    {"name": "Egg (Whole, Boiled)", "category": "Eggs", "calories_per_100g": 155, "protein_g": 12.6, "carbs_g": 1.1, "fat_g": 10.6, "is_halal": True, "is_vegan": False, "is_vegetarian": True, "is_pakistani_local": False, "serving_size_g": 50, "serving_description": "1 large egg"},
    {"name": "Oats (Rolled)", "category": "Grains", "calories_per_100g": 389, "protein_g": 16.9, "carbs_g": 66.3, "fat_g": 6.9, "fiber_g": 10.6, "is_halal": True, "is_vegan": True, "is_vegetarian": True, "is_pakistani_local": False, "serving_size_g": 80, "serving_description": "1 cup dry"},
    {"name": "Banana", "category": "Fruits", "calories_per_100g": 89, "protein_g": 1.1, "carbs_g": 22.8, "fat_g": 0.3, "fiber_g": 2.6, "is_halal": True, "is_vegan": True, "is_vegetarian": True, "is_pakistani_local": False, "serving_size_g": 120, "serving_description": "1 medium banana"},
    {"name": "Whey Protein Powder", "category": "Supplements", "calories_per_100g": 370, "protein_g": 75.0, "carbs_g": 10.0, "fat_g": 4.0, "is_halal": None, "is_vegan": False, "is_vegetarian": True, "is_keto_friendly": True, "is_pakistani_local": False, "serving_size_g": 30, "serving_description": "1 scoop"},
    {"name": "Almonds", "category": "Nuts", "calories_per_100g": 579, "protein_g": 21.2, "carbs_g": 21.6, "fat_g": 49.9, "fiber_g": 12.5, "is_halal": True, "is_vegan": True, "is_vegetarian": True, "is_keto_friendly": True, "is_pakistani_local": False, "serving_size_g": 28, "serving_description": "1 small handful (23 almonds)"},
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Seed exercises
        from sqlalchemy import select
        existing = await db.execute(select(Exercise.slug))
        existing_slugs = {row[0] for row in existing.fetchall()}

        added_ex = 0
        for ex_data in EXERCISES:
            if ex_data["slug"] not in existing_slugs:
                ex = Exercise(**ex_data)
                db.add(ex)
                added_ex += 1

        # Seed food items
        existing_food = await db.execute(select(FoodItem.name))
        existing_names = {row[0] for row in existing_food.fetchall()}

        added_food = 0
        for food_data in FOOD_ITEMS:
            if food_data["name"] not in existing_names:
                food = FoodItem(**food_data)
                db.add(food)
                added_food += 1

        await db.commit()
        print(f"✅ Seeded {added_ex} exercises and {added_food} food items")


if __name__ == "__main__":
    asyncio.run(seed())
