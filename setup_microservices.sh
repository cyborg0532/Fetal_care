#!/bin/bash
# setup_microservices.sh
# Run ONCE from the project root to complete the microservices migration.
# This script:
#   1. Renames backend → core_backend (if not already done)
#   2. Fixes all Python imports: "from backend." → "from core_backend."
#   3. Copies chroma_db + data_manifest into ai_service/
#   4. Creates a symlink ai_service → core_backend venv (saves re-installing)
#   5. Removes the old ai_buddy router from core_backend

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== MaternalCare Microservices Setup ==="

# ── Step 1: Rename backend → core_backend ────────────────────────────────────
if [ -d "backend" ] && [ ! -d "core_backend" ]; then
    echo "[1/5] Renaming backend/ → core_backend/ ..."
    mv backend core_backend
    echo "      Done."
elif [ -d "core_backend" ]; then
    echo "[1/5] core_backend/ already exists — skipping rename."
else
    echo "[1/5] ERROR: Neither backend/ nor core_backend/ found. Exiting."
    exit 1
fi

# ── Step 2: Fix Python imports ────────────────────────────────────────────────
echo "[2/5] Patching Python imports: 'from backend.' → 'from core_backend.' ..."
find core_backend -name "*.py" -not -path "*/\.*" | while read -r f; do
    sed -i \
        -e 's/from backend\./from core_backend./g' \
        -e 's/import backend\./import core_backend./g' \
        -e "s/from backend import/from core_backend import/g" \
        "$f"
done
echo "      Done."

# ── Step 3: Copy chroma_db + data_manifest to ai_service ─────────────────────
echo "[3/5] Migrating ChromaDB data to ai_service/ ..."
if [ -d "core_backend/chroma_db" ] && [ ! -d "ai_service/chroma_db" ]; then
    cp -r core_backend/chroma_db ai_service/chroma_db
    echo "      Copied chroma_db."
else
    echo "      ai_service/chroma_db already exists or source missing — skipping."
fi

if [ -f "core_backend/data_manifest.json" ] && [ ! -f "ai_service/data_manifest.json" ]; then
    cp core_backend/data_manifest.json ai_service/data_manifest.json
    echo "      Copied data_manifest.json."
fi

# ── Step 4: Symlink venv so ai_service reuses installed deps ──────────────────
echo "[4/5] Linking ai_service to core_backend venv (avoids re-downloading heavy deps) ..."
if [ -d "core_backend/.venv" ] && [ ! -e "ai_service/.venv" ]; then
    ln -s "$(pwd)/core_backend/.venv" ai_service/.venv
    echo "      Symlinked ai_service/.venv → core_backend/.venv"
else
    echo "      Symlink already exists or core_backend/.venv not found — skipping."
fi

# ── Step 5: Remove old ai_buddy artefacts from core_backend ──────────────────
echo "[5/5] Cleaning up ai_buddy from core_backend/ ..."
rm -f core_backend/routers/ai_buddy.py
rm -f core_backend/services/ai_buddy.py
rm -f core_backend/chroma_db/chroma.sqlite3 2>/dev/null || true
echo "      Removed core_backend/routers/ai_buddy.py and services/ai_buddy.py."

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Run:  ./start.sh"
echo "     → core_backend starts on port 8000"
echo "     → ai_service    starts on port 8001"
echo "     → frontend       starts on port 8081"
echo ""
echo "  2. Make sure Ollama is running: sudo systemctl start ollama"
echo "  3. Open http://localhost:8081 in your browser"
