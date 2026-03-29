#!/usr/bin/env bash

echo "======================================"
echo "Starting Linux AI Assistant"
echo "======================================"

OLLAMA_PID=""
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo "Shutting down..."
    [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null
    [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null
    [ -n "$OLLAMA_PID" ] && kill "$OLLAMA_PID" 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# check ollama running
if ! pgrep -x "ollama" > /dev/null
then
    echo "Starting Ollama..."
    ollama serve &
    OLLAMA_PID=$!
    sleep 2
fi

echo ""
echo "Starting backend..."

cd backend
node server.js &
BACKEND_PID=$!

cd ..

echo ""
echo "Starting frontend..."

cd frontend
npm run dev &
FRONTEND_PID=$!

cd ..

echo ""
echo "======================================"
echo "Linux AI Assistant running"
echo ""
echo "Frontend: http://localhost:5173"
echo "Backend : http://localhost:3000"
echo ""
echo "Press CTRL+C to stop"
echo "======================================"

wait
