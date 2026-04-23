@echo off
echo ==========================================
echo Starting GUARDPLAY AI DRM PLATFORM...
echo ==========================================
echo.
cd backend
start "GuardPlay Backend" cmd /k "npm start"
echo.
echo ✅ Backend server is starting!
echo 🌐 Access the platform at: http://localhost:3000
echo.
echo ==========================================
timeout /t 3 > nul
explorer http://localhost:3000
pause
