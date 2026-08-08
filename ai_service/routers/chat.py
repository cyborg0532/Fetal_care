"""
Chat router for the AI Microservice.

Endpoints (no auth required — local service only):
  POST /api/v1/chat/maternal   — Maternal AI Buddy
  POST /api/v1/chat/father     — Father Portal AI
"""
from fastapi import APIRouter, HTTPException, File, UploadFile, Form
from pydantic import BaseModel, Field

from ai_service.services.rag import query_rag, query_report_analysis

router = APIRouter(prefix="/api/v1/chat", tags=["AI Chat"])


class ReportAnalysisRequest(BaseModel):
    report_text: str = Field(min_length=10, max_length=15000, description="Raw text of the medical report")


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000, description="User's message")


class ChatResponse(BaseModel):
    response: str
    portal: str


@router.post("/maternal", response_model=ChatResponse)
async def maternal_chat(payload: ChatRequest):
    """
    Maternal AI Buddy — calm, empathetic, grounded in WHO/ACOG medical guidelines.
    """
    try:
        text = await query_rag(payload.message.strip(), portal_type="maternal")
        return ChatResponse(response=text, portal="maternal")
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="AI service temporarily unavailable.") from exc


@router.post("/father", response_model=ChatResponse)
async def father_chat(payload: ChatRequest):
    """
    Father Portal AI — practical, supportive guide for expectant fathers/partners.
    """
    try:
        text = await query_rag(payload.message.strip(), portal_type="father")
        return ChatResponse(response=text, portal="father")
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=502, detail="AI service temporarily unavailable.") from exc


@router.post("/analyze-report")
async def analyze_report(
    file: UploadFile = File(None),
    report_text: str = Form(None)
):
    """
    Analyzes medical report text, image, or PDF and returns a simplified JSON breakdown.
    """
    try:
        import json
        file_bytes = None
        mime_type = None
        if file:
            file_bytes = await file.read()
            mime_type = file.content_type
            
        raw_json_str = await query_report_analysis(
            report_text=report_text,
            file_bytes=file_bytes,
            mime_type=mime_type
        )
        return json.loads(raw_json_str)
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(exc)}") from exc


@router.get("/health")
async def ai_health():
    """Quick health check — confirms RAG collections are reachable."""
    from ai_service.services.rag import _get_collection, OLLAMA_BASE, OLLAMA_MODEL
    import httpx
    try:
        chunks = _get_collection().count()
    except Exception as e:
        chunks = -1

    ollama_ok = False
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            r = await client.get(f"{OLLAMA_BASE}/api/tags")
            ollama_ok = r.status_code == 200
    except Exception:
        pass

    return {
        "chromadb_chunks": chunks,
        "ollama_reachable": ollama_ok,
        "ollama_model": OLLAMA_MODEL,
    }
