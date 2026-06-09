@echo off
title DevPulse Backend
cd /d F:\Hackathons\devpulse\backend
echo Installing/verifying required packages...
python -m pip install uvicorn fastapi pymongo python-dotenv google-genai mcp python-multipart certifi dnspython --quiet
echo.
echo Starting DevPulse Backend on port 8000...
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
