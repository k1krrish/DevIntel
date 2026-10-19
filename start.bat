@echo off
echo ===================================================
echo           Starting DevIntel Local Environment
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting FastAPI Backend on port 8000...
start "DevIntel Backend" cmd /k "cd backend && ..\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/3] Starting React Vite Frontend on port 5173...
start "DevIntel Frontend" cmd /k "cd frontend && npm run dev"

echo [3/3] Opening browser at http://localhost:5173...
timeout /t 3 >nul
start http://localhost:5173

echo.
echo DevIntel is running! You can keep the two console windows open.
echo To stop DevIntel later, simply close those console windows.
