@echo off
title TTS Bot Panel
echo ===============================
echo   WhatsApp TTS Bot Panel
echo ===============================
echo.
echo Menjalankan panel di background...
echo Buka browser: http://localhost:3000
echo.
echo Untuk stop: tutup window ini atau Ctrl+C
echo.

:: Jalankan panel di background (window tetap minimize)
start /min "TTS Bot Panel" cmd /k "cd /d %~dp0 && node panel.js"

:: Tunggu sebentar lalu buka browser otomatis
timeout /t 2 /nobreak >nul
start http://localhost:3000

echo Panel berjalan. Window ini bisa ditutup.
timeout /t 3 /nobreak >nul
exit
