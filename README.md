# Athletix Backend — Phase 1: Database + FastAPI

## Tech Stack
- **FastAPI** — Async Python web framework
- **PostgreSQL** — Primary database
- **SQLAlchemy 2.0** — Async ORM
- **Alembic** — Database migrations
- **JWT (python-jose)** — Auth tokens
- **Passlib + Bcrypt** — Password hashing

---

## Project Structure
```
athletix-backend/
├── app/
│   ├── main.py               ← FastAPI app entry point
│   ├── core/
│   │   ├── config.py         ← Settings from .env
│   │   └── security.py       ← JWT + password utils
│   ├── db/
│   │   └── session.py        ← Async DB engine + Base
│   ├── models/
│   │   └── models.py         ← ALL SQLAlchemy tables
│   ├── schemas/
│   │   ├── user_schemas.py   ← Auth + profile Pydantic
│   │   └── schemas.py        ← Workout/diet/chat Pydantic
│   ├── services/
│   │   ├── user_service.py   ← User/profile DB ops
│   │   ├── workout_service.py← Workout/form DB ops
│   │   └── diet_service.py   ← Diet/progress DB ops
│   └── api/routes/
│       ├── auth.py           ← /api/v1/auth/*
│       ├── users.py          ← /api/v1/users/*
│       ├── workouts.py       ← /api/v1/workouts/*
│       ├── diet_progress.py  ← /api/v1/diet/* + /progress/*
│       └── chat.py           ← /api/v1/chat/* (Phase 3 stub)
├── alembic/                  ← DB migration scripts
├── seed.py                   ← Populate exercises + foods
├── requirements.txt
└── .env.example
```

---

## Database Tables
| Table | Purpose |
|-------|---------|
| `users` | Auth credentials |
| `user_profiles` | Body attributes (height, limb length, etc.) + goals |
| `exercises` | Exercise library (8 seeded, linked to XGBoost models) |
| `workout_plans` | AI-generated plans per user |
| `workout_plan_days` | Day breakdown of a plan |
| `workout_plan_exercises` | Exercises per day with sets/reps |
| `workout_sessions` | Completed workouts (live tracking) |
| `session_exercises` | Exercises done in a session |
| `form_analysis_logs` | **XGBoost results per rep** (your ML pipeline output) |
| `food_items` | USDA + local Pakistani foods (halal/vegan flags) |
| `diet_plans` | AI-generated diet plans |
| `diet_plan_meals` | Meals per day |
| `meal_food_items` | Food → meal junction with portions |
| `progress_records` | Weekly body metrics + gamification |
| `chat_sessions` | AI Trainer conversations |
| `chat_messages` | Individual messages (Phase 3: RAG responses here) |

---

## Setup

### 1. Install dependencies
```bash
pip install -r requirements.txt
```

### 2. Create PostgreSQL database
```bash
psql -U postgres -c "CREATE DATABASE athletix_db;"
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your database password and a strong SECRET_KEY
```

### 4. Run migrations
```bash
alembic upgrade head
```
Or just start the server — tables auto-create on startup.

### 5. Seed the database
```bash
python seed.py
# Seeds 8 exercises (linked to your XGBoost models) + 15 food items
```

### 6. Start the server
```bash
uvicorn app.main:app --reload --port 8000
```

### 7. Open API docs
```
http://localhost:8000/docs    ← Swagger UI (test all endpoints here)
http://localhost:8000/redoc   ← ReDoc
```

---

## API Endpoints

### Auth (`/api/v1/auth/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/register` | Create account |
| POST | `/login` | Get JWT tokens |
| POST | `/refresh` | Refresh access token |
| GET | `/me` | Get current user |

### Profile (`/api/v1/users/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/me/profile` | Get fitness profile |
| PUT | `/me/profile` | Update body attributes, goals, diet type |

### Workouts (`/api/v1/workouts/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/exercises` | Browse exercise library |
| GET | `/exercises/{id}` | Get exercise details + XGBoost model file |
| GET | `/plans` | Get my workout plans |
| GET | `/plans/active` | Get current active plan |
| POST | `/plans` | Create workout plan |
| POST | `/sessions/start` | Start live workout |
| PATCH | `/sessions/{id}/end` | End workout + save stats |
| GET | `/sessions` | Session history |
| POST | `/form-analysis` | **Submit XGBoost rep result** |
| GET | `/form-analysis/{exercise_id}/history` | Form improvement over time |

### Diet (`/api/v1/diet/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/foods?q=&is_halal=&is_pakistani=` | Search food database |
| GET | `/plans` | My diet plans |
| POST | `/plans` | Create diet plan |

### Progress (`/api/v1/progress/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Log today's weight/body fat |
| GET | `/` | Progress history for charts |
| GET | `/latest` | Latest record |

### AI Chat (`/api/v1/chat/`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sessions` | New conversation |
| GET | `/sessions` | All conversations |
| POST | `/sessions/{id}/messages` | Send message (stub → RAG in Phase 3) |

---

## Connecting to React Native
Point your React Native app's API calls to:
```
http://YOUR_LOCAL_IP:8000/api/v1/
```
Example in React Native:
```javascript
const API_BASE = 'http://192.168.1.X:8000/api/v1';

// Login
const res = await fetch(`${API_BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const { access_token } = await res.json();

// Protected request
const profile = await fetch(`${API_BASE}/users/me/profile`, {
  headers: { 'Authorization': `Bearer ${access_token}` },
});
```

---

## Phase 2 (Next)
- [ ] Diet planner constraint optimizer (pulp/scipy) → auto-generate meals
- [ ] Workout planner RL (LinUCB contextual bandit)
- [ ] Connect XGBoost models to `/form-analysis` endpoint for server-side inference

## Phase 3
- [ ] RAG pipeline (FAISS + LangChain + Mistral-7B)
- [ ] Fine-tune on fitness corpus
- [ ] Replace chat stub with real LLM responses
