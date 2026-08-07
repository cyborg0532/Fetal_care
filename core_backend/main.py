"""
MaternalCare Core Backend — lightweight CRUD API.

Runs on port 8000. Cloud-deployable (Railway / Render / Fly.io).

Exposes:
  - /auth     — JWT authentication
  - /tracker  — Pregnancy tracker
  - /medicines + /mood
  - /sos

AI / RAG functionality has been extracted to the local ai_service (port 8001).
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core_backend.database import Base, engine
from core_backend.routers import auth, tracker, medicines, mood, sos, pcos

logging.basicConfig(level=logging.INFO)

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="MaternalCare Core API",
    description="Lightweight CRUD backend for MaternalCare. AI endpoints are served by the local ai_service on port 8001.",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=".*",   # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register CRUD routers only — no AI/RAG
app.include_router(auth.router)
app.include_router(tracker.router)
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
        "note": "AI/RAG endpoints are on the local ai_service at port 8001",
    }
