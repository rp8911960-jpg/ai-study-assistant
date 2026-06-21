@echo off
echo ===================================================
echo     Starting AI Study Assistant Environment
echo ===================================================
echo.

echo [1/2] Setting up and starting the Frontend...
cd frontend
:: Add Node.js to PATH in case it's not configured globally
set PATH=%PATH%;C:\Program Files\nodejs
call npm install --legacy-peer-deps
start cmd /k "title AI Study Assistant - Frontend && echo Starting Frontend Server... && npm run dev"
cd ..

echo.
echo [2/2] Setting up and starting the Backend...
cd backend
python -m venv venv
call venv\Scripts\activate.bat
python -m pip install -r requirements.txt
start cmd /k "title AI Study Assistant - Backend && echo Starting Backend Server... && uvicorn app.main:app --reload --port 8000"
cd ..

echo.
echo ===================================================
echo Both servers are launching in separate windows!
echo Once they start, open your browser and navigate to:
echo http://localhost:5173
echo ===================================================
pause
