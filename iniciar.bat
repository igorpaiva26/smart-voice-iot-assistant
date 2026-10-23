@echo off
set "PATH=C:\Program Files\nodejs;C:\Program Files\Git\cmd;%PATH%"
cd /d "%~dp0"
start "" wscript "%~dp0iniciar.vbs"
exit
