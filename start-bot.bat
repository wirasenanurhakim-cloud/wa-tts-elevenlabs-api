@echo off
cd /d "D:\HAKIM\SAHAM\2026\MARET\BOT TTS"
for /f %%I in ('powershell -command "Get-Date -Format yyyyMMdd_HHmmss"') do set dt=%%I
set logfile=D:\HAKIM\SAHAM\2026\MARET\BOT TTS\backup\bot_%dt%.log
node index.js >> "%logfile%" 2>&1