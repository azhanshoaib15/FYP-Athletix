from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.db.session import engine, Base
from app.api.routes.auth import router as auth_router
from app.api.routes.users import router as users_router
from app.api.routes.workouts import router as workouts_router
from app.api.routes.diet_progress import diet_router, progress_router
from app.api.routes.chat import router as chat_router


# ── Lifespan: create tables on startup ────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Import all models so Base knows about them before creating tables
    from app.models import models  # noqa: F401
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Athletix database tables created/verified")
    yield
    await engine.dispose()


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
## Athletix - Fitness Intelligence Technology API

A Virtual AI Fitness Trainer backend providing:
- 🔐 JWT Authentication
- 👤 User profiles with body attributes for personalized training
- 🏋️ Exercise library + workout plan management
- 📹 Form analysis logging (XGBoost results from MediaPipe pipeline)
- 🥗 Diet plans with cultural/dietary filters (Halal, Vegan, Keto)
- 📊 Progress tracking + gamification
- 🤖 AI Trainer chat (Phase 3: RAG + fine-tuned LLM)
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS (React Native + web dev) ─────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ────────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

app.include_router(auth_router,     prefix=API_PREFIX)
app.include_router(users_router,    prefix=API_PREFIX)
app.include_router(workouts_router, prefix=API_PREFIX)
app.include_router(diet_router,     prefix=API_PREFIX)
app.include_router(progress_router, prefix=API_PREFIX)
app.include_router(chat_router,     prefix=API_PREFIX)


# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }


@app.get("/", tags=["Health"])
async def root():
    return {"message": f"Welcome to {settings.APP_NAME} API. Visit /docs for Swagger UI."}
