#!/bin/bash
# fix_structure.sh — Repairs the core_backend layout regardless of current state.
# Run from project root: bash fix_structure.sh

set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "=== MaternalCare — Structure Fix ==="
echo "Working directory: $ROOT"
echo ""

# ── Diagnose current state ─────────────────────────────────────────────────────
echo "[Diagnose] Scanning directories..."
echo "Contents of project root:"
ls -la | grep -E "backend|core|ai_service"
echo ""

# ── Case 1: backend/ still exists alongside core_backend/ ─────────────────────
# This means mv tried to merge and backend/ has all the real Python files.
# Fix: copy backend/* into core_backend/ (merge), then patch imports.
if [ -d "backend" ] && [ -d "core_backend" ]; then
    echo "[Fix] Both backend/ and core_backend/ exist."
    echo "      Merging backend/ → core_backend/ (overwrite=no for existing files)..."

    # Copy everything from backend into core_backend (skip existing newer files)
    cp -rn backend/. core_backend/

    # Overwrite the specific files we care about patching
    cp backend/__init__.py     core_backend/__init__.py
    cp backend/config.py       core_backend/config.py
    cp backend/database.py     core_backend/database.py
    cp backend/models.py       core_backend/models.py
    cp backend/schemas.py      core_backend/schemas.py

    # Copy venv if core_backend doesn't have one
    if [ ! -d "core_backend/.venv" ] && [ -d "backend/.venv" ]; then
        echo "      Symlinking venv: core_backend/.venv → backend/.venv"
        ln -s "$ROOT/backend/.venv" core_backend/.venv
    fi

    # Copy routers (all except ai_buddy)
    for f in backend/routers/*.py; do
        fname="$(basename "$f")"
        if [ "$fname" != "ai_buddy.py" ]; then
            cp "$f" "core_backend/routers/$fname"
        fi
    done
    echo "      Merge done."

# ── Case 2: backend/ was moved inside core_backend/ ──────────────────────────
elif [ -d "core_backend/backend" ] && [ ! -d "backend" ]; then
    echo "[Fix] backend/ was moved inside core_backend/. Hoisting files up..."
    cp -rn core_backend/backend/. core_backend/
    if [ ! -d "core_backend/.venv" ] && [ -d "core_backend/backend/.venv" ]; then
        ln -s "$ROOT/core_backend/backend/.venv" core_backend/.venv
    fi
    rm -rf core_backend/backend
    echo "      Hoist done."

# ── Case 3: Only core_backend/ exists with all files ─────────────────────────
elif [ -d "core_backend" ] && [ ! -d "backend" ]; then
    echo "[Fix] core_backend/ exists and backend/ is gone — looks correct already."

else
    echo "[Fix] Unexpected state. Aborting. Check directory structure manually."
    exit 1
fi

# ── Patch Python imports: backend → core_backend ──────────────────────────────
echo ""
echo "[Patch] Fixing Python imports in core_backend/ ..."
find core_backend -name "*.py" -not -path "*/\.*" -not -path "*/__pycache__/*" | while read -r f; do
    # Skip files we already rewrote (main.py is correct)
    if grep -q "from backend\." "$f" 2>/dev/null || grep -q "from backend import" "$f" 2>/dev/null; then
        sed -i \
            -e 's/from backend\./from core_backend./g' \
            -e 's/from backend import/from core_backend import/g' \
            -e 's/import backend\./import core_backend./g' \
            "$f"
        echo "      Patched: $f"
    fi
done

# ── Remove ai_buddy files from core_backend ────────────────────────────────────
echo ""
echo "[Clean] Removing ai_buddy from core_backend/ ..."
rm -f core_backend/routers/ai_buddy.py
rm -f core_backend/services/ai_buddy.py
echo "      Done."

# ── Set up ai_service venv symlink ────────────────────────────────────────────
echo ""
echo "[AI] Setting up ai_service venv symlink ..."
VENV_SRC=""
[ -d "core_backend/.venv" ] && VENV_SRC="$ROOT/core_backend/.venv"
[ -d "backend/.venv"      ] && VENV_SRC="$ROOT/backend/.venv"

if [ -n "$VENV_SRC" ] && [ ! -e "ai_service/.venv" ]; then
    ln -s "$VENV_SRC" ai_service/.venv
    echo "      Symlinked ai_service/.venv → $VENV_SRC"
else
    echo "      Skipped (already exists or venv not found)."
fi

# ── Copy chroma_db to ai_service ───────────────────────────────────────────────
echo ""
echo "[AI] Migrating ChromaDB to ai_service/ ..."
for SRC_CHROMA in "core_backend/chroma_db" "backend/chroma_db"; do
    if [ -d "$SRC_CHROMA" ] && [ ! -d "ai_service/chroma_db" ]; then
        cp -r "$SRC_CHROMA" ai_service/chroma_db
        echo "      Copied $SRC_CHROMA → ai_service/chroma_db"
        break
    fi
done
for SRC_MANIFEST in "core_backend/data_manifest.json" "backend/data_manifest.json"; do
    if [ -f "$SRC_MANIFEST" ] && [ ! -f "ai_service/data_manifest.json" ]; then
        cp "$SRC_MANIFEST" ai_service/data_manifest.json
        echo "      Copied $SRC_MANIFEST → ai_service/data_manifest.json"
        break
    fi
done

# ── Final validation ──────────────────────────────────────────────────────────
echo ""
echo "=== Validation ==="
echo "core_backend/ key files:"
for f in __init__.py main.py config.py database.py models.py schemas.py; do
    if [ -f "core_backend/$f" ]; then
        echo "  ✓ $f"
    else
        echo "  ✗ MISSING: $f"
    fi
done

echo ""
echo "core_backend/routers/ :"
ls core_backend/routers/*.py 2>/dev/null | xargs -I{} basename {} | sed 's/^/  /'

echo ""
echo "ai_service/ key files:"
for f in main.py requirements.txt services/rag.py services/watcher.py routers/chat.py; do
    if [ -f "ai_service/$f" ]; then
        echo "  ✓ $f"
    else
        echo "  ✗ MISSING: $f"
    fi
done

echo ""
echo "=== Fix complete! ==="
echo "Run: ./start.sh"
