#!/usr/bin/env bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR/NotebookLM-Lite"

echo "=== Starting LECTRA Academic Collaboration Platform ==="

# Activate Python virtual environment
source .venv/bin/activate

echo "Starting Backend API on http://localhost:8000..."
uvicorn backend.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "Starting Frontend on http://localhost:5173..."
cd frontend
npm run dev &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
