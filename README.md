<<<<<<< HEAD
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
=======
<<<<<<< HEAD
# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
=======
# Athletix — A Fitness Intelligence Technology

Athletix is an AI-powered fitness companion that bridges the gap between technology and human trainers by delivering personalized workouts, culturally and medically adaptive diet plans, and real-time biomechanics-aware form analysis.  
It provides an intelligent, cost-effective, and accessible fitness experience for everyone — anytime, anywhere.

---

## Motivation
Traditional fitness solutions either rely on costly personal trainers or generic apps that fail to adapt to individual needs.  
Athletix introduces a Virtual AI Trainer that learns from users over time — understanding their goals, limitations, and preferences — creating a truly personalized fitness journey through the integration of AI, ML, and Computer Vision.

---

## Key Features
- **Virtual AI Trainer (Knowledge Hub)**  
  Powered by Retrieval-Augmented Generation (RAG) and fine-tuned LLMs.  
  Answers fitness, nutrition, and recovery queries safely and accurately.  

- **Real-Time Form Analysis**  
  Uses HRNet for pose estimation and biomechanics-aware feedback.  
  Detects incorrect form to prevent injuries and improve effectiveness.  

- **Adaptive Diet Planning**  
  Generates diet plans using ML-based macro balancing and constraint optimization.  
  Supports cultural and medical restrictions (Halal, Vegan, Keto, Diabetic).  

- **Reinforcement Learning Adaptation**  
  Continuously adjusts workouts and diets based on user progress, preferences, and feedback.  

- **Progress & Tracking Dashboard**  
  Tracks calories, workouts, adherence, and progress visually for long-term motivation.  

---

## Tech Stack
| Layer | Technology |
|--------|-------------|
| Frontend | React Native (Cross-Platform Mobile App) |
| Backend | FastAPI + PostgreSQL + FAISS (Vector DB for RAG) |
| AI Modules | TensorFlow Lite, PyTorch, Hugging Face Transformers |
| CV Model | HRNet for Pose Estimation & Form Analysis |
| ML / RL | Contextual Bandits + Constraint-Based Optimizer |
| Other Tools | MediaPipe, OpenCV, Python |

---

## Sustainable Development Goals (SDGs)
Athletix supports the United Nations SDGs by:
- **SDG 3:** Good Health & Well-being — promoting fitness, injury prevention, and healthy lifestyles.  
- **SDG 9:** Industry, Innovation & Infrastructure — fostering innovation through AI-driven fitness solutions.  
- **SDG 10:** Reduced Inequalities — offering culturally inclusive and affordable fitness guidance globally.  

---

## Impact
- Bridges the gap between human coaching and AI through intelligent personalization.  
- Accessible alternative to expensive trainers — fitness for everyone.  
- Culturally inclusive approach ensures global adaptability.  
- Scalable and sustainable — deployable across mobile platforms.

---

## Team
- Khawaja Mohammad Abdullah Ishaq  
- Subhan Tariq  
- Azhan Shoaib

---

## References
- [USDA FoodData Central (2023)](https://fdc.nal.usda.gov)  
- [World Health Organization — Physical Activity Guidelines (2024)](https://www.who.int)  
- [Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks — Lewis et al., 2020](https://arxiv.org/abs/2005.11401)  
- [Mobile Apps for Human Nutrition: A Review — Ahmad et al., 2021](https://orcid.org/0000-0003-3173-6814)

---

### Vision
Athletix envisions a world where AI democratizes fitness — making expert-level guidance, safe training, and personalized nutrition accessible to every individual, regardless of background or resources.
>>>>>>> c69cbacc5cea539cc94ea295e8179c95eb26c0c8
>>>>>>> 62c5ac244c2d1244ed6def1e1354752a0f1c7c80
