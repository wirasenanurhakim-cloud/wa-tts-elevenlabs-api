@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0"
title TTS Bot Control

:MENU
cls
echo.
echo  ==========================================
echo   WhatsApp TTS Bot  ^|  Control Panel
echo  ==========================================
echo.

:: Cek apakah bot sedang berjalan
set "RUNNING=0"
for /f "tokens=1" %%a in ('tasklist /fi "imagename eq node.exe" /fo csv /nh 2^>nul') do (
    if "%%~a"=="node.exe" set "RUNNING=1"
)

if "!RUNNING!"=="1" (
    echo   Status : [RUNNING]
) else (
    echo   Status : [STOPPED]
)
echo.
echo   [1] Start Bot
echo   [2] Stop Bot
echo   [3] Relog  ^(hapus auth + restart^)
echo   [4] Lihat Log
echo   [5] Exit
echo.
set /p "CHOICE=  Pilih [1-5]: "

if "%CHOICE%"=="1" goto START
if "%CHOICE%"=="2" goto STOP
if "%CHOICE%"=="3" goto RELOG
if "%CHOICE%"=="4" goto VIEWLOG
if "%CHOICE%"=="5" exit
goto MENU

:START
if "!RUNNING!"=="1" (
    echo.
    echo  [!] Bot sudah berjalan.
    timeout /t 2 /nobreak >nul
    goto MENU
)
echo.
echo  [*] Starting bot...
wscript //nologo "%~dp0start-bot.vbs"
timeout /t 2 /nobreak >nul
echo  [OK] Bot dijalankan di background.
timeout /t 2 /nobreak >nul
goto MENU

:STOP
echo.
echo  [*] Stopping bot...
taskkill /f /im node.exe >nul 2>&1
if exist "%~dp0tmp\bot.pid" del "%~dp0tmp\bot.pid"
echo  [OK] Bot dihentikan.
timeout /t 2 /nobreak >nul
goto MENU

:RELOG
echo.
echo  [*] Menghentikan bot...
taskkill /f /im node.exe >nul 2>&1
timeout /t 1 /nobreak >nul

echo  [*] Menghapus auth...
if exist "%~dp0auth_info" (
    rmdir /s /q "%~dp0auth_info"
    echo  [OK] Auth dihapus.
) else (
    echo  [!] Auth folder tidak ditemukan.
)

echo  [*] Restart bot...
timeout /t 1 /nobreak >nul
wscript //nologo "%~dp0start-bot.vbs"
echo  [OK] Bot restart. QR akan muncul di browser sebentar lagi...
timeout /t 3 /nobreak >nul
goto MENU

:VIEWLOG
cls
echo  ==========================================
echo   Log Bot (50 baris terakhir)
echo  ==========================================
echo.
if not exist "%~dp0logs\bot.log" (
    echo  [!] Log belum ada.
) else (
    powershell -command "Get-Content '%~dp0logs\bot.log' -Tail 50"
)
echo.
echo  ------------------------------------------
echo  [R] Refresh log    [C] Clear log    [Enter] Kembali
set /p "LOGCHOICE=  Pilih: "
if /i "%LOGCHOICE%"=="R" goto VIEWLOG
if /i "%LOGCHOICE%"=="C" (
    if exist "%~dp0logs\bot.log" del "%~dp0logs\bot.log"
    echo  [OK] Log dibersihkan.
    timeout /t 1 /nobreak >nul
)
goto MENU
