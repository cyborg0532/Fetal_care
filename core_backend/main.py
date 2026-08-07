"""
MaternalCare Core Backend — lightweight CRUD API.

Runs on port 8000. Cloud-deployable (Railway / Render / Fly.io).

Exposes:
  - /auth          — JWT authentication
  - /tracker       — Pregnancy tracker
  - /appointments  — Appointment management
  - /community     — Community groups & posts
  - /medicines     — Medicine reminders
  - /mood          — Mood tracking
  - /sos           — Emergency SOS
  - /pcos          — PCOS assessment
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core_backend.database import Base, engine
from core_backend.routers import auth, tracker, medicines, mood, sos, pcos, appointments, community

logging.basicConfig(level=logging.INFO)

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MaternalCare Core API",
    description="Lightweight CRUD backend for MaternalCare.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all CRUD routers
app.include_router(auth.router)
app.include_router(tracker.router)
app.include_router(appointments.router)
app.include_router(community.router)
app.include_router(medicines.router)
app.include_router(mood.router)
app.include_router(sos.router)
app.include_router(pcos.router)


@app.get("/")
def health():
    return {
        "service": "MaternalCare Core API",
        "version": "2.0.0",
        "status": "healthy",
        "docs": "/docs",
    }
