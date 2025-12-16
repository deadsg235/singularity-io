@echo off
title Singularity.io Installer
color 0B

echo ========================================
echo    SINGULARITY.IO INSTALLER
echo ========================================
echo.

echo Running comprehensive setup...
python setup.py

if errorlevel 1 (
    echo.
    echo Installation failed. Please check errors above.
    pause
    exit /b 1
)

echo.
echo ✓ Installation complete!
echo ✓ Desktop shortcut created
echo ✓ All dependencies installed
echo.
echo Double-click "Singularity.io" on your desktop to launch
pause