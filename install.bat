@echo off
title Singularity.io Installer
color 0B

echo ========================================
echo    SINGULARITY.IO INSTALLER
echo ========================================
echo.

:: Create desktop shortcut
echo Creating desktop shortcut...
set "desktop=%USERPROFILE%\Desktop"
set "shortcut=%desktop%\Singularity.io.lnk"
set "target=%cd%\launch.bat"

powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%shortcut%'); $Shortcut.TargetPath = '%target%'; $Shortcut.WorkingDirectory = '%cd%'; $Shortcut.Save()"

echo ✓ Desktop shortcut created
echo ✓ Installation complete
echo.
echo Double-click "Singularity.io" on your desktop to launch
pause