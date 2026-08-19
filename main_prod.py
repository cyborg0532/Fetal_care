"""
MaternalCare Unified Production API — Entrypoint for Docker & Render deployment.

Combines core_backend (CRUD API) and ai_service (RAG + AI endpoints) into a 
single FastAPI instance running on a single port ($PORT).
"""
import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core_backend.database import Base, engine
from core_backend.routers import auth, tracker, medicines, mood, sos, pcos, health_records
from ai_service.routers.chat import router as ai_chat_router
from ai_service.services.rag import sync_data_folder
from ai_service.services.watcher import start_watcher, stop_watcher

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("maternalcare.prod")


@asynccontextmanager
async def prod_lifespan(app: FastAPI):
    """Production Lifespan: DB migration + RAG PDF Sync & Watchdog setup."""
    import asyncio

    logger.info("[Production Startup] Initializing Database Schema...")
    Base.metadata.create_all(bind=engine)

    logger.info("[Production Startup] Indexing RAG PDF Documents in ./Data...")
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(None, sync_data_folder)
    except Exception as exc:
        logger.warning(f"[Production Startup] RAG PDF sync warning: {exc}")

    try:
        start_watcher()
    except Exception as exc:
        logger.warning(f"[Production Startup] Watchdog start warning: {exc}")

    yield

    try:
        stop_watcher()
    except Exception:
        pass
    logger.info("[Production Shutdown] Cleanup completed.")


app = FastAPI(
    title="MaternalCare Production API",
    description="Unified API serving CRUD endpoints and RAG AI endpoints on Render.",
    version="2.0.0",
    lifespan=prod_lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 1. Register Core Backend Routers
app.include_router(auth.router)
app.include_router(tracker.router)
app.include_router(medicines.router)
app.include_router(mood.router)
app.include_router(sos.router)
app.include_router(pcos.router)
app.include_router(health_records.router)

# 2. Register AI RAG Router (/api/v1/chat/...)
app.include_router(ai_chat_router)


@app.get("/")
def root():
    return {
        "status": "healthy",
        "service": "MaternalCare Unified Production API",
        "version": "2.0.0",
        "docs": "/docs",
        "endpoints": {
            "auth": "/auth",
            "tracker": "/tracker",
            "medicines": "/medicines",
            "mood": "/mood",
            "sos": "/sos",
            "pcos": "/pcos",
            "health_records": "/health-records",
            "ai_maternal_chat": "/api/v1/chat/maternal",
            "ai_father_chat": "/api/v1/chat/father",
            "ai_report_analysis": "/api/v1/chat/analyze-report",
        },
    }
