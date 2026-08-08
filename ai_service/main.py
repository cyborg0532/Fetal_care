"""
MaternalCare AI Microservice — runs on port 8001.

Responsibilities:
  - RAG pipeline: ChromaDB + sentence-transformers embeddings
  - Ollama LLM generation (local, http://localhost:11434)
  - Live PDF folder sync via Watchdog (../Data/)
  - Dual chat endpoints: /api/v1/chat/maternal and /api/v1/chat/father

No database, no auth — stateless local service.
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ai_service.routers.chat import router as chat_router

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s:\t  %(name)s - %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: sync PDFs + start watcher. Shutdown: stop watcher."""
    import asyncio
    from ai_service.services.rag import sync_data_folder
    from ai_service.services.watcher import start_watcher, stop_watcher

    logger.info("[AI Service] Starting up on port 8001 ...")

    # Run initial full sync in thread (blocking I/O)
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, sync_data_folder)

    # Start live Watchdog observer
    start_watcher()

    yield  # ── service runs ──

    stop_watcher()
    logger.info("[AI Service] Shutdown complete.")


app = FastAPI(
    title="MaternalCare AI Service",
    description=(
        "Local RAG microservice — ChromaDB + Ollama + live PDF sync. "
        "No auth required; bind to localhost for security."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # all origins — team on same Wi-Fi can call this
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)


@app.get("/")
def root():
    return {
        "service": "MaternalCare AI Microservice",
        "version": "1.0.0",
        "port": 8001,
        "endpoints": {
            "maternal_chat": "POST /api/v1/chat/maternal",
            "father_chat": "POST /api/v1/chat/father",
            "health": "GET /api/v1/chat/health",
            "docs": "/docs",
        },
    }
