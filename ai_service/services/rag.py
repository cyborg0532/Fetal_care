"""
RAG service for the AI Microservice.

Architecture:
  - Embeddings : sentence-transformers/all-MiniLM-L6-v2  (on-device)
  - Vector DB  : ChromaDB  (persistent, ./chroma_db relative to ai_service/)
  - LLM        : Ollama    (http://localhost:11434)
  - PDF Source : ../Data/  (root Data folder, watched live by Watchdog)
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
from pathlib import Path
from typing import Literal

import httpx

logger = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
_HERE       = Path(__file__).resolve().parent        # ai_service/services/
_AI_SERVICE = _HERE.parent                           # ai_service/
_ROOT       = _AI_SERVICE.parent                     # project root

DATA_DIR      = _ROOT / "Data"
CHROMA_DIR    = _AI_SERVICE / "chroma_db"
MANIFEST_FILE = _AI_SERVICE / "data_manifest.json"

import base64
from dotenv import load_dotenv

# Load core_backend/.env for Gemini API key
load_dotenv(dotenv_path=_ROOT / "core_backend" / ".env")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# ── Ollama ────────────────────────────────────────────────────────────────────
OLLAMA_BASE  = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "phi4-mini:latest")


async def _get_available_ollama_model(client: httpx.AsyncClient, preferred_model: str) -> str:
    """Check if preferred model exists, otherwise fallback to any installed model in Ollama."""
    try:
        resp = await client.get(f"{OLLAMA_BASE}/api/tags")
        if resp.status_code == 200:
            models = [m.get("name", "") for m in resp.json().get("models", [])]
            if preferred_model in models:
                return preferred_model
            # Match by prefix (e.g. llama3.2:latest matches llama3.2)
            for m in models:
                if preferred_model.split(":")[0] in m or m.split(":")[0] in preferred_model:
                    return m
            if models:
                logger.info("[RAG] Model '%s' not found. Falling back to installed model '%s'.", preferred_model, models[0])
                return models[0]
    except Exception as e:
        logger.warning("[RAG] Could not fetch Ollama models list: %s", e)
    return preferred_model

# ── ChromaDB ──────────────────────────────────────────────────────────────────
COLLECTION_NAME = "maternal_care_docs"

# ── Chunking ──────────────────────────────────────────────────────────────────
CHUNK_SIZE    = 500
CHUNK_OVERLAP = 75
TOP_K         = 3

# ── System prompts ────────────────────────────────────────────────────────────
MATERNAL_SYSTEM_PROMPT = """\
You are a calm, empathetic, and knowledgeable maternal care AI buddy.
Your primary role is to inform, reassure, and guide pregnant women through their pregnancy journey.

RETRIEVED CONTEXT FROM VERIFIED MEDICAL GUIDELINES:
{context}

RULES:
1. Ground your answers primarily on the retrieved medical context above.
2. Maintain a neutral, compassionate, and non-judgmental tone.
3. If a symptom indicates a medical emergency (e.g., severe vaginal bleeding, sudden facial swelling,
   severe abdominal pain, decreased fetal movement), immediately advise the user to contact her
   healthcare provider or visit an emergency room before explaining details.
4. Keep answers concise, clear, and easy to read.
5. Never diagnose. Never replace professional obstetric advice.\
"""

FATHER_SYSTEM_PROMPT = """\
You are an empathetic, practical AI guide specifically designed to assist fathers, partners,
and carers during pregnancy and postpartum.

RETRIEVED CONTEXT FROM VERIFIED GUIDELINES:
{context}

RULES:
1. Address the user directly as a supportive partner/father.
2. Focus on practical action steps: how to physically support her, emotional guidance, and what
   to expect during each pregnancy stage.
3. Ground your guidance in the medical context provided above.
4. If the partner reports severe emergency symptoms regarding the pregnant mother, urge them to
   seek immediate clinical care or call emergency services.
5. Keep answers warm, practical, and concise.\
"""

PortalType = Literal["maternal", "father"]

# ═══════════════════════════════════════════════════════════════════════════════
# Manifest helpers
# ═══════════════════════════════════════════════════════════════════════════════

def _load_manifest() -> dict[str, str]:
    if MANIFEST_FILE.exists():
        try:
            return json.loads(MANIFEST_FILE.read_text())
        except Exception:
            pass
    return {}


def _save_manifest(manifest: dict[str, str]) -> None:
    MANIFEST_FILE.write_text(json.dumps(manifest, indent=2))


def _md5(path: Path) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


COLLECTION_NAME = "fetal_maternal_docs"
CHUNK_SIZE      = 500
CHUNK_OVERLAP   = 50

def _get_collection():
    global _chroma_collection
    if _chroma_collection is None:
        import chromadb
        CHROMA_DIR.mkdir(parents=True, exist_ok=True)
        client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        _chroma_collection = client.get_or_create_collection(
            name=COLLECTION_NAME,
            metadata={"hnsw:space": "cosine"},
        )
        logger.info("[RAG] ChromaDB ready at %s (%d chunks)", CHROMA_DIR, _chroma_collection.count())
    return _chroma_collection


def _get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        from sentence_transformers import SentenceTransformer
        logger.info("[RAG] Loading all-MiniLM-L6-v2 ...")
        _embedding_model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        logger.info("[RAG] Embedding model ready.")
    return _embedding_model


def _embed(texts: list[str]) -> list[list[float]]:
    return _get_embedding_model().encode(texts, show_progress_bar=False, normalize_embeddings=True).tolist()


TOP_K = 3

PortalType = Literal["maternal", "father"]

MATERNAL_SYSTEM_PROMPT = """\
You are a warm, empathetic, and expert Maternal Care AI assistant.
Your goal is to provide reassuring, clear, and medically grounded guidance to pregnant women.

VERIFIED MEDICAL GUIDELINES FOR REFERENCE:
{context}
"""

FATHER_SYSTEM_PROMPT = """\
You are a supportive, knowledgeable Father Portal AI assistant.
Your goal is to guide fathers on supporting their pregnant partners with practical health advice.

VERIFIED MEDICAL GUIDELINES FOR REFERENCE:
{context}
"""



def chunk_text(text: str, chunk_size: int = 500, overlap: int = 50) -> list[str]:
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
    return chunks


def index_pdf(pdf_path: Path) -> int:
    from pypdf import PdfReader
    reader = PdfReader(str(pdf_path))
    text = ""
    for page in reader.pages:
        text += (page.extract_text() or "") + "\n"

    if not text.strip():
        logger.warning("[RAG] No text found in '%s'.", pdf_path.name)
        return 0

    chunks = chunk_text(text)
    collection = _get_collection()
    stem = pdf_path.stem
    ids = [f"{stem}__chunk_{i}" for i in range(len(chunks))]
    metas = [{"source": pdf_path.name, "chunk_index": i} for i in range(len(chunks))]

    collection.upsert(ids=ids, embeddings=_embed(chunks), documents=chunks, metadatas=metas)
    logger.info("[RAG] Indexed %d chunks from '%s'.", len(chunks), pdf_path.name)
    return len(chunks)


def delete_pdf_chunks(filename: str) -> None:
    collection = _get_collection()
    results = collection.get(where={"source": filename})
    ids = results.get("ids", [])
    if ids:
        collection.delete(ids=ids)
        logger.info("[RAG] Deleted %d chunks for '%s'.", len(ids), filename)


def sync_data_folder() -> None:
    logger.info("[RAG Sync] Scanning '%s' ...", DATA_DIR)
    if not DATA_DIR.exists():
        logger.warning("[RAG Sync] Data dir not found: %s", DATA_DIR)
        return

    _get_collection()
    manifest = _load_manifest()
    current_pdfs = {p.name: p for p in DATA_DIR.glob("*.pdf") if p.is_file()}
    added = modified = deleted = 0

    for fname in list(manifest):
        if fname not in current_pdfs:
            delete_pdf_chunks(fname)
            del manifest[fname]
            deleted += 1

    for fname, path in current_pdfs.items():
        h = _md5(path)
        if fname not in manifest or manifest[fname] != h:
            delete_pdf_chunks(fname)
            index_pdf(path)
            manifest[fname] = h
            added += 1

    _save_manifest(manifest)
    logger.info("[RAG Sync] Complete — Added=%d Modified=%d Deleted=%d", added, modified, deleted)


# ═══════════════════════════════════════════════════════════════════════════════
# query_rag  —  4-Tier Fallback Query Engine
# ═══════════════════════════════════════════════════════════════════════════════

async def query_rag(prompt: str, portal_type: PortalType = "maternal") -> str:
    collection = _get_collection()

    # 1. Retrieve top-K RAG chunks from Data/ PDFs
    query_embedding = await asyncio.to_thread(_embed, [prompt])
    n = min(TOP_K, max(collection.count(), 1))
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=n,
        include=["documents"],
    )
    docs = results.get("documents", [[]])[0]
    context = "\n\n---\n\n".join(docs) if docs else "No specific guidelines retrieved for this query."

    template = FATHER_SYSTEM_PROMPT if portal_type == "father" else MATERNAL_SYSTEM_PROMPT
    system = template.format(context=context)

    # Tier 1: Gemini API
    res = await _generate_gemini(system_prompt=system, user_prompt=prompt)
    if res: return res

    # Tier 2: Groq API
    res = await _generate_groq(system_prompt=system, user_prompt=prompt)
    if res: return res

    # Tier 3: Local Ollama
    res = await _generate_ollama(system_prompt=system, user_prompt=prompt)
    if res: return res

    # Tier 4: Graceful Demo Mode
    logger.warning("[RAG Fallback] All cloud API models and Ollama are unavailable. Returning grounded RAG context for demo.")
    return (
        "💡 **MaternalCare Guidance (Verified Medical Data)**:\n\n"
        f"{context[:800]}\n\n"
        "*(Note: Displaying direct verified medical guidelines; cloud API daily tokens currently undergoing reset).* "
        "Always consult your healthcare provider for clinical decisions."
    )


ANALYSIS_SYSTEM_PROMPT = """\
You are an expert medical communicator specializing in translating complex medical documents into warm, comforting, and extremely simple terms for non-medical users (specifically pregnant mothers and older generations).

You MUST respond with a valid JSON object ONLY. Do not wrap it in markdown block tags.

JSON Structure:
{
  "summary": "A 2-3 sentence overview of what this report means in simple words (avoiding jargon).",
  "key_indicators": [
    {
      "name": "Name of indicator (e.g. Hemoglobin)",
      "value": "Value from report (e.g. 10.5 g/dL)",
      "status": "normal / low / high",
      "explanation": "Simple explanation of what this indicator does and means, using a warm analogy."
    }
  ],
  "jargon_buster": [
    {
      "term": "Complex term (e.g. Erythrocytes)",
      "meaning": "Simple everyday definition (e.g. Red blood cells)."
    }
  ],
  "action_steps": [
    "Simple daily lifestyle action step 1 (diet/rest/hydration)",
    "Simple daily lifestyle action step 2",
    "Simple daily lifestyle action step 3"
  ],
  "warning_flags": [
    "Specific warning symptoms that should make them consult their OB-GYN immediately."
  ]
}

Ensure all medical jargon is simplified. Always maintain a comforting, reassuring, and non-alarmist tone.

VERIFIED MEDICAL GUIDELINES FOR REFERENCE:
{context}
"""


async def query_report_analysis(
    report_text: str | None = None,
    file_bytes: bytes | None = None,
    mime_type: str | None = None
) -> str:
    extracted_text = ""
    if file_bytes and mime_type == "application/pdf":
        try:
            import io
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(file_bytes))
            extracted_text = "\n".join(p.extract_text() or "" for p in reader.pages)
        except Exception as e:
            logger.warning("[RAG] Failed to extract PDF text for RAG lookup: %s", e)

    search_query = report_text or extracted_text or "routine prenatal blood panel ultrasound scan guidelines"
    collection = _get_collection()
    query_embedding = await asyncio.to_thread(_embed, [search_query[:1000]])
    n = min(TOP_K, max(collection.count(), 1))
    results = collection.query(
        query_embeddings=query_embedding,
        n_results=n,
        include=["documents"],
    )
    docs = results.get("documents", [[]])[0]
    context = "\n\n---\n\n".join(docs) if docs else "No specific guidelines retrieved for this report."

    if file_bytes and mime_type:
        if mime_type != "application/pdf":
            raise ValueError(
                "Analyzing images requires setting the GEMINI_API_KEY in core_backend/.env. "
                "The local AI service only supports text or PDF documents."
            )
        # If it was a PDF, use the extracted text
        active_text = extracted_text
    else:
        active_text = report_text or ""

    if not active_text.strip():
        raise ValueError("No extractable text found in the report.")

    system = ANALYSIS_SYSTEM_PROMPT.format(context=context)
    try:
        async with httpx.AsyncClient(timeout=150.0) as client:
            model_to_use = await _get_available_ollama_model(client, OLLAMA_MODEL)
            payload = {
                "model":  model_to_use,
                "system": system,
                "prompt": f"Analyze this report:\n\n{active_text}",
                "stream": False,
                "format": "json",
                "options": {"temperature": 0.2, "num_predict": 1024, "num_ctx": 4096},
            }
            resp = await client.post(f"{OLLAMA_BASE}/api/generate", json=payload)
            if resp.status_code != 200:
                body = resp.text[:500]
                logger.error("[RAG] Ollama Report Analyzer %d: %s", resp.status_code, body)
                raise ValueError(f"Ollama error {resp.status_code}: {body}")
            text = (resp.json().get("response") or "").strip()
            if not text:
                raise ValueError("Ollama returned an empty response.")
            return text
    except httpx.ConnectError:
        raise ValueError(f"Cannot connect to Ollama at {OLLAMA_BASE}. Run: ollama serve")
    except httpx.HTTPStatusError as exc:
        body = exc.response.text[:500]
        raise ValueError(f"Ollama HTTP {exc.response.status_code}: {body}") from exc

