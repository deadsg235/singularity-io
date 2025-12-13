@echo off
echo 🚀 Singularity.io - Quick Start
echo ================================

echo Installing minimal dependencies...
pip install fastapi uvicorn requests

echo.
echo Starting API server...
cd api
uvicorn main:app --reload --host 0.0.0.0 --port 8000

pause
