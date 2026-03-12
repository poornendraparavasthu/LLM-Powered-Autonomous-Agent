#!/usr/bin/env bash

echo "======================================"
echo "Starting Linux AI Assistant"
echo "======================================"

# check ollama running
if ! pgrep -x "ollama" > /dev/null
then
    echo "Starting Ollama..."
    ollama serve &
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