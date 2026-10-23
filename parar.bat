@echo off
title Aline - Parando Servicos
echo ========================================
echo   Aline - Parando Servicos
echo ========================================
echo.

echo [1/2] Parando Backend (porta 3001)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 " 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo [2/2] Parando Frontend (porta 5173)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 " 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)

echo.
echo ========================================
echo   Aline parada com sucesso!
echo ========================================
echo.
timeout /t 2 /nobreak >nul
exit
