"""
WeatherGPT — FastAPI Application Entry Point
"""

import sys
import asyncio

# psycopg requires SelectorEventLoop on Windows (ProactorEventLoop is not supported)
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import logging
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from sqlalchemy import text

from app.config import get_settings
from app.database import AsyncSessionLocal
from app.routers import weather, alerts, advisories, chat, locations, users, voice, auth, shelters

logger = logging.getLogger("weathergpt.api")
settings = get_settings()

app = FastAPI(
    title="WeatherGPT API",
    description="Conversational AI for Weather Forecasting, Alerts, and Climate Information",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Global Database Exception Handlers (Security Hardening) ──────────────────
@app.exception_handler(IntegrityError)
async def integrity_error_handler(request: Request, exc: IntegrityError):
    """Sanitize database integrity errors to avoid leaking table/constraint internals."""
    logger.error(f"Database IntegrityError on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_409_CONFLICT,
        content={"detail": "Database conflict or constraint violation"},
    )


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_error_handler(request: Request, exc: SQLAlchemyError):
    """Sanitize database errors to prevent leaking raw SQL, table names, or credentials."""
    logger.error(f"Database SQLAlchemyError on {request.method} {request.url.path}: {exc}")
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "A database error occurred. Please try again later."},
    )

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(weather.router)
app.include_router(alerts.router)
app.include_router(advisories.router)
app.include_router(chat.router)
app.include_router(locations.router)
app.include_router(users.router)
app.include_router(voice.router)
app.include_router(auth.router)
app.include_router(shelters.router)


# ── Health Checks ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["health"])
async def health_check():
    return {
        "status": "ok",
        "service": "WeatherGPT API",
        "version": "1.0.0",
    }


@app.get("/api/health/db", tags=["health"])
async def database_health_check():
    """Verify PostgreSQL connectivity without leaking connection strings or credentials."""
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "postgresql",
            "connected": True,
        }
    except Exception as exc:
        logger.error(f"PostgreSQL health check failed: {exc}")
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "database": "postgresql",
                "connected": False,
                "detail": "Database service unavailable",
            },
        )


@app.get("/", tags=["root"])
async def root():
    return {
        "message": "WeatherGPT API is running",
        "docs": "/docs",
        "health": "/health",
        "db_health": "/api/health/db",
    }
