@echo off
echo 🎤 Google Cloud TTS Credentials Setup
echo =====================================
echo.

echo HƯỚNG DẪN:
echo 1. Mở file JSON vừa download từ Google Cloud
echo 2. Copy TOÀN BỘ nội dung JSON (phải là 1 dòng)
echo 3. Paste vào đây khi được hỏi
echo 4. Nhấn Enter để setup
echo.

set /p CREDENTIALS="Paste JSON credentials here: "

if "%CREDENTIALS%"=="" (
    echo ❌ Error: No credentials provided!
    pause
    exit /b 1
)

echo.
echo 🔧 Setting up environment variable...
set GOOGLE_CLOUD_KEY_JSON=%CREDENTIALS%

echo ✅ Credentials set successfully!
echo.
echo 🧪 Testing TTS API...
timeout /t 2 /nobreak > nul

REM Test API endpoint
echo Testing health check...
curl http://localhost:3000/api/text-to-speech 2>nul
if errorlevel 1 (
    echo ⚠️ Server không chạy. Hãy start server trước:
    echo    vercel dev --port 3000
) else (
    echo ✅ TTS API is working!
)

echo.
echo 🎯 Credentials đã được set cho session này.
echo    Để permanent, thêm vào System Environment Variables
echo.
pause 