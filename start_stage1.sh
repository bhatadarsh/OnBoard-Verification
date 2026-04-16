#!/bin/bash

# Start FastAPI backend
echo "Starting FastAPI backend on port 8000..."
cd /Users/sv-mac-313/Documents/Interview_System/backend
/Users/sv-mac-313/Documents/Interview_System/venv/bin/python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start React frontend
echo "Starting React frontend on port 3000..."
cd /Users/sv-mac-313/Documents/Interview_System/frontend
npm run dev &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "Stage 1: Authentication System Running"
echo "========================================="
echo "Backend (FastAPI): http://localhost:8000"
echo "Frontend (React):  http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" INT
wait
