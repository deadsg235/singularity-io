@echo off
title Singularity.io Launcher
color 0B

echo ========================================
echo    SINGULARITY.IO DESKTOP LAUNCHER
echo ========================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found. Please install Python 3.8+ first.
    echo Download from: https://www.python.org/downloads/
    pause
    exit /b 1
)

echo [1/3] Checking Python installation...
python --version

echo [2/3] Installing dependencies...
pip3 install --quiet --upgrade pip
pip3 install --quiet tkinter requests solana solders anchorpy base58 cryptography pynacl

echo [3/3] Starting Singularity.io...
echo.
python main.py

if errorlevel 1 (
    echo.
    echo Application closed with error.
    pause
)