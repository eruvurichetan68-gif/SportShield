@echo off
echo Starting SportShield Application...
echo.
echo Starting Backend Server...
cd backend
start "SportShield Backend" cmd /k "npm start"
echo.
echo Backend server is starting on http://localhost:3000
echo.
echo Please open frontend/index.html in your browser
echo or run: cd frontend && npx http-server . -p 8080
echo.
pause
