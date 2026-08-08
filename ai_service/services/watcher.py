"""
Watchdog observer — live PDF folder watcher.

Monitors ../Data for changes and keeps ChromaDB in sync in real-time.
Runs in a daemon thread managed by the FastAPI lifespan.
"""
from __future__ import annotations

import logging
import threading
from pathlib import Path

from watchdog.events import FileSystemEventHandler, FileSystemEvent
from watchdog.observers import Observer

from ai_service.services.rag import DATA_DIR, delete_pdf_chunks, index_pdf, _load_manifest, _save_manifest, _md5

logger = logging.getLogger(__name__)

_observer: Observer | None = None
_manifest_lock = threading.Lock()


class _PDFEventHandler(FileSystemEventHandler):
    """Handle create / modify / delete / move events for .pdf files."""

    def _is_pdf(self, path: str) -> bool:
        return path.lower().endswith(".pdf")

    def on_created(self, event: FileSystemEvent) -> None:
        if event.is_directory or not self._is_pdf(event.src_path):
            return
        pdf = Path(event.src_path)
        logger.info("[Watcher] Created: %s", pdf.name)
        with _manifest_lock:
            manifest = _load_manifest()
            index_pdf(pdf)
            manifest[pdf.name] = _md5(pdf)
            _save_manifest(manifest)

    def on_modified(self, event: FileSystemEvent) -> None:
        if event.is_directory or not self._is_pdf(event.src_path):
            return
        pdf = Path(event.src_path)
        logger.info("[Watcher] Modified: %s", pdf.name)
        with _manifest_lock:
            manifest = _load_manifest()
            delete_pdf_chunks(pdf.name)
            index_pdf(pdf)
            manifest[pdf.name] = _md5(pdf)
            _save_manifest(manifest)

    def on_deleted(self, event: FileSystemEvent) -> None:
        if event.is_directory or not self._is_pdf(event.src_path):
            return
        fname = Path(event.src_path).name
        logger.info("[Watcher] Deleted: %s", fname)
        with _manifest_lock:
            manifest = _load_manifest()
            delete_pdf_chunks(fname)
            manifest.pop(fname, None)
            _save_manifest(manifest)

    def on_moved(self, event: FileSystemEvent) -> None:
        # Treat as delete-old + create-new
        if event.is_directory:
            return
        src  = Path(event.src_path)
        dest = Path(event.dest_path)
        if self._is_pdf(str(src)):
            logger.info("[Watcher] Moved (remove): %s", src.name)
            with _manifest_lock:
                manifest = _load_manifest()
                delete_pdf_chunks(src.name)
                manifest.pop(src.name, None)
                _save_manifest(manifest)
        if self._is_pdf(str(dest)) and dest.exists():
            logger.info("[Watcher] Moved (add): %s", dest.name)
            with _manifest_lock:
                manifest = _load_manifest()
                index_pdf(dest)
                manifest[dest.name] = _md5(dest)
                _save_manifest(manifest)


def start_watcher() -> None:
    """Start the Watchdog observer in a daemon thread. Call from FastAPI startup."""
    global _observer
    if _observer is not None:
        return
    handler   = _PDFEventHandler()
    _observer = Observer()
    _observer.schedule(handler, str(DATA_DIR), recursive=False)
    _observer.daemon = True
    _observer.start()
    logger.info("[Watcher] Live watching '%s' for PDF changes.", DATA_DIR)


def stop_watcher() -> None:
    """Stop the observer. Call from FastAPI shutdown."""
    global _observer
    if _observer is not None:
        _observer.stop()
        _observer.join(timeout=5)
        _observer = None
        logger.info("[Watcher] Stopped.")
