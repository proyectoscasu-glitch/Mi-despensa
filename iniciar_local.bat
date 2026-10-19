@echo off
title Mi Despensa - Servidor Local
chcp 65001 >nul
echo Iniciando Mi Despensa...
where py >nul 2>nul
if %errorlevel% equ 0 (
    py "%~dp0iniciar_local.py"
) else (
    python "%~dp0iniciar_local.py"
)
pause
