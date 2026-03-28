# WorkoutCoach

AI-powered fitness tracking and coaching platform that combines workout logging, real-time pose estimation for form analysis, AI-generated personalized workouts, and multi-persona coaching chatbots.

---

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- A [Supabase](https://supabase.com) project
- An [Anthropic API key](https://console.anthropic.com)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/WorkoutCoach.git
cd WorkoutCoach
```

### 2. Set up the Next.js frontend

```bash
cd workoutcoach
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

Start the dev server:

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

### 3. Set up the inference server (for video tracking)

```bash
cd inference-server
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```

The inference server runs at `http://localhost:8000`.

### 4. Database setup

Create a `workouts` table in your Supabase project:

| Column     | Type    | Notes                          |
| ---------- | ------- | ------------------------------ |
| `id`       | uuid    | Primary key, auto-generated    |
| `date`     | text    | Format: YYYY-MM-DD             |
| `exercise` | text    | Lowercase with underscores     |
| `weight`   | numeric |                                |
| `reps`     | integer |                                |
| `sets`     | integer |                                |
| `rpe`      | numeric | 1–10 scale                     |
| `notes`    | text    | Optional                       |

---

## What It Does

### Workout Logging & History

Upload workout data via CSV (supports the Strong app export format) or add exercises manually. View your full training history grouped by date with volume summaries, best sets, and the ability to edit or delete individual entries.

### AI Workout Generation

Describe what you want to train and the app generates a structured workout plan using Claude, personalized based on your recent training history, body metrics, and goals.

### Real-Time Pose Estimation

Use your webcam to get live form analysis during exercises. A YOLOv8-pose model detects 17 body keypoints, calculates joint angles, and counts reps automatically. Supported exercises:

- Squat
- Bicep curl
- Overhead press
- Lateral raise

### AI Coaching Chat

Chat with 5 specialized coaching personas, each analyzing your training data from a different perspective:

- **Strength Coach** — force production and progressive overload
- **Hypertrophy Coach** — muscle growth and volume optimization
- **Powerlifting Coach** — competition lift technique and programming
- **Recovery Advisor** — fatigue management and injury prevention
- **Movement Coach** — mobility and movement quality

Each coach has full context on your recent workouts and profile to give personalized advice.

---

## Tech Stack

**Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, Framer Motion

**Backend:** FastAPI, YOLOv8-pose (ultralytics), OpenCV, WebSockets

**AI:** Claude (Anthropic SDK) — Haiku for chat, Sonnet for workout generation

**Database:** Supabase (PostgreSQL)

---

## Project Structure

```
WorkoutCoach/
├── workoutcoach/                   # Next.js frontend
│   ├── app/
│   │   ├── page.tsx                # Main app (6 tabs)
│   │   ├── api/
│   │   │   ├── chat/               # Streaming chat with personas
│   │   │   ├── upload/             # CSV import
│   │   │   ├── workouts/           # CRUD operations
│   │   │   └── generate-workout/   # AI workout plans
│   │   └── components/
│   │       ├── VideoTracker.tsx     # Webcam + pose estimation
│   │       ├── StatsOverlay.tsx     # Rep count display
│   │       ├── WorkoutCards.tsx     # Workout history
│   │       ├── AddExerciseForm.tsx  # Manual entry
│   │       └── LandingHero.tsx     # Landing page
│   └── lib/
│       ├── personas.ts             # Coaching personas
│       ├── supabase.ts             # Database client
│       └── videoTypes.ts           # Video tracking types
│
├── inference-server/               # Python pose estimation server
│   ├── main.py                     # FastAPI + WebSocket endpoint
│   ├── rep_counter.py              # Rep counting state machine
│   ├── requirements.txt
│   ├── Dockerfile
│   └── yolov8n-pose.pt             # Pose model weights
│
└── README.md
```

---

## Environment Variables

| Variable                           | Where        | Required | Description                                      |
| ---------------------------------- | ------------ | -------- | ------------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`         | `.env.local` | Yes      | Supabase project URL                             |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`    | `.env.local` | Yes      | Supabase anonymous key                           |
| `ANTHROPIC_API_KEY`                | `.env.local` | Yes      | Anthropic API key for Claude                     |
| `NEXT_PUBLIC_INFERENCE_WS_URL`     | `.env.local` | No       | WebSocket URL for inference server (default: `ws://localhost:8000/ws/track`) |
| `CORS_ORIGINS`                     | Shell env    | No       | Comma-separated allowed origins for inference server (default: `http://localhost:3000,http://localhost:3001`) |
