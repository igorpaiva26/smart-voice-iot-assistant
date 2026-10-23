@echo off
title Aline - Smart Home Assistant
set "PATH=C:\Program Files\nodejs;C:\Program Files\Git\cmd;%PATH%"

echo ========================================
echo   Iniciando Aline (Desktop + Bandeja)
echo ========================================
echo.

:: 1. Inicia backend se não estiver rodando
powershell -Command "try { (Invoke-WebRequest -Uri 'http://localhost:3001/api/health' -TimeoutSec 1 -UseBasicParsing).StatusCode } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo [1/2] Iniciando Backend...
    cd /d "%~dp0backend"
    start /b cmd /c "npm.cmd run dev > "%~dp0backend.log" 2>&1"
    timeout /t 2 /nobreak >nul
) else (
    echo [1/2] Backend ja esta ativo!
)

:: 2. Inicia o aplicativo desktop Electron
echo [2/2] Abrindo Aplicativo Desktop...
cd /d "%~dp0"
start "" cmd /c "npm.cmd start"

echo.
echo ========================================
echo   Aline iniciada com sucesso!
echo   Icone adicionado a bandeja do Windows.
echo ========================================
echo.
timeout /t 3 /nobreak >nul
exit
