#!/bin/bash
# ./start.sh — MaternalCare Microservices Launcher
# Starts: core_backend (port 8000) + ai_service (port 8001) + frontend (port 8081)

# ── Color codes ───────────────────────────────────────────────────────────────
C_CORE="\033[1;35m"    # Magenta  — Core Backend
C_AI="\033[1;33m"      # Yellow   — AI Service
C_SYS="\033[1;32m"     # Green    — System messages
C_RESET="\033[0m"

echo -e "${C_SYS}[System] Starting MaternalCare Microservices...${C_RESET}"

# ── Resolve venv python ───────────────────────────────────────────────────────
# Check multiple possible locations in priority order
if [ -f "core_backend/.venv/bin/python" ]; then
    PYTHON="$(pwd)/core_backend/.venv/bin/python"
elif [ -f "backend/.venv/bin/python" ]; then
    PYTHON="$(pwd)/backend/.venv/bin/python"
else
    PYTHON="python3"
fi
echo -e "${C_SYS}[System] Using Python: $PYTHON${C_RESET}"

# ── Auto-kill existing processes on microservice ports ────────────────────────
for port in 8000 8001 8081; do
    if fuser ${port}/tcp >/dev/null 2>&1; then
        echo -e "${C_SYS}[System] Clearing existing process on port ${port}...${C_RESET}"
        fuser -k ${port}/tcp >/dev/null 2>&1
    fi
done

# ── Cleanup on Ctrl+C ─────────────────────────────────────────────────────────
cleanup() {
    echo -e "\n${C_SYS}[System] Stopping all services...${C_RESET}"
    [ -n "$CORE_PID"  ] && kill -9 "$CORE_PID"  2>/dev/null
    [ -n "$AI_PID"    ] && kill -9 "$AI_PID"    2>/dev/null
    [ -n "$FRONT_PID" ] && kill -9 "$FRONT_PID" 2>/dev/null
    fuser -k 8000/tcp 8001/tcp 8081/tcp >/dev/null 2>&1
    exit 0
}
trap cleanup SIGINT SIGTERM SIGHUP

# ── 1. Core Backend (port 8000) ───────────────────────────────────────────────
echo -e "${C_CORE}[Core] Starting CRUD backend on port 8000...${C_RESET}"
CORE_MODULE="core_backend.main:app"
# Fallback: if backend/ hasn't been renamed yet, use old module name
[ ! -d "core_backend" ] && CORE_MODULE="backend.main:app"

"$PYTHON" -m uvicorn "$CORE_MODULE" --host 0.0.0.0 --port 8000 --reload 2>&1 | while read -r line; do
    echo -e "${C_CORE}[Core]${C_RESET} $line"
done &
CORE_PID=$!

sleep 2

# ── 2. AI Microservice (port 8001) ────────────────────────────────────────────
echo -e "${C_AI}[AI] Starting AI microservice on port 8001...${C_RESET}"

# ai_service uses same venv (symlinked by setup_microservices.sh)
AI_PYTHON="$PYTHON"
[ -f "ai_service/.venv/bin/python" ] && AI_PYTHON="$(pwd)/ai_service/.venv/bin/python"

"$AI_PYTHON" -m uvicorn ai_service.main:app --host 0.0.0.0 --port 8001 --reload 2>&1 | while read -r line; do
    echo -e "${C_AI}[AI]${C_RESET} $line"
done &
AI_PID=$!

# Port forwarding for connected Android USB devices
if command -v adb &> /dev/null; then
    if adb devices | grep -q "device$"; then
        echo -e "${C_SYS}[System] Connected Android device detected via USB. Setting up ADB reverse forwarding...${C_RESET}"
        adb reverse tcp:8000 tcp:8000 2>/dev/null
        adb reverse tcp:8001 tcp:8001 2>/dev/null
        adb reverse tcp:8081 tcp:8081 2>/dev/null
        export REACT_NATIVE_PACKAGER_HOSTNAME=localhost
    fi
fi

echo -e "${C_SYS}"
echo -e "[System] All services launched:"
echo -e "  Core Backend  → http://localhost:8000  (CRUD API)"
echo -e "  AI Service    → http://localhost:8001  (RAG + Ollama)"
echo -e "  Frontend      → http://localhost:8081  (React Native/Expo CLI - Interactive)"
echo -e "${C_RESET}"

# ── 3. Frontend Interactive CLI (Port 8081) ──────────────────────────────────
cd frontend
export REACT_NATIVE_PACKAGER_HOSTNAME=localhost
npm run android

