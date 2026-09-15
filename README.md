# WeatherGPT 🌦️

Conversational AI for Weather Forecasting, Alerts, and Climate Information — a 24-hour hackathon project.

## What it does

- **AI Weather Chatbot** — Ask natural-language questions ("Will it rain tomorrow in Vijayawada?") and get answers grounded in real weather data
- **Real-Time Weather** — Current conditions, hourly & 7-day forecasts via Open-Meteo
- **Extreme Weather Alerts** — Rule-based engine for heavy rain, extreme heat, strong wind, thunderstorms
- **Intelligent Advisories** — Agriculture, travel, outdoor, and safety recommendations
- **Multilingual** — English, Telugu, Hindi
- **Voice** — Voice input and text-to-speech (optional, added after core)

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | Python, FastAPI, SQLAlchemy (async) |
| Database | PostgreSQL (local) |
| Weather API | Open-Meteo (free, no key) |
| LLM | Google Gemini 1.5 Flash |
| Geocoding | Nominatim (OpenStreetMap, free) |

---

## Prerequisites

Make sure you have the following installed on your machine:

- **Node.js** 18+ and npm
- **Python** 3.11+
- **PostgreSQL** 14+ (running locally)
- A **Google Gemini API key** — get one free at [aistudio.google.com](https://aistudio.google.com)

---

## Local Setup

### 1. Clone the repository

```bash
git clone <repo-url>
cd WeatherGPT
```

### 2. Create the PostgreSQL database

```sql
-- Connect to your local PostgreSQL and run:
CREATE DATABASE weathergpt;
```

### 3. Configure the backend

```bash
cd backend
cp ../.env.example .env
```

Edit `backend/.env` and fill in:

```env
DATABASE_URL=postgresql+asyncpg://YOUR_USER:YOUR_PASSWORD@localhost:5432/weathergpt
GEMINI_API_KEY=your_gemini_api_key_here
```

All other values have sensible defaults.

### 4. Set up the Python virtual environment

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 5. Run database migrations

```bash
cd backend
alembic upgrade head
```

This creates all tables in your local PostgreSQL database.

### 6. Start the backend

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

Backend runs at: http://localhost:8000  
API docs (auto-generated): http://localhost:8000/docs

### 7. Configure the frontend

```bash
cd frontend
cp ../.env.example .env.local
```

The `.env.local` file only needs:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_DEFAULT_LANGUAGE=en
```

### 8. Install frontend dependencies and run

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at: http://localhost:3000

---

## Project Structure

```
WeatherGPT/
├── frontend/          # Next.js 14 App Router (TypeScript + Tailwind)
├── backend/           # FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── models/    # SQLAlchemy ORM models
│   │   ├── schemas/   # Pydantic request/response schemas
│   │   ├── routers/   # FastAPI route handlers
│   │   ├── services/  # Business logic (weather, LLM, alerts, advisory)
│   │   └── utils/     # Cache, i18n helpers
│   └── alembic/       # Database migrations
├── database/          # SQL seed files
├── docs/              # Architecture and API documentation
├── .env.example       # Environment variable template
└── README.md
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/weather/current` | Current weather for a location |
| GET | `/api/weather/forecast` | Hourly + daily forecast |
| GET | `/api/weather/history` | Historical weather data |
| GET | `/api/alerts` | Active weather alerts |
| GET | `/api/advisories` | Weather-based advisories |
| POST | `/api/chat` | AI chatbot message |
| GET | `/api/locations/search` | Geocode a city name |
| GET | `/health` | Health check |

---

## Environment Variables

See `.env.example` for the full list with descriptions. The only required secrets are:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `GEMINI_API_KEY` | ✅ | Google AI Studio API key |

All other variables have defaults.

---

## License

MIT
