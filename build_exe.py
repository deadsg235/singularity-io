"""
Build Singularity.io as standalone executable
"""

import os
import sys
import subprocess

def build_executable():
    """Build standalone .exe using PyInstaller"""
    
    # Install PyInstaller if not available
    try:
        import PyInstaller
    except ImportError:
        print("Installing PyInstaller...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"])
    
    # PyInstaller command
    cmd = [
        "pyinstaller",
        "--onefile",
        "--windowed",
        "--name=Singularity",
        "--icon=icon.ico",
        "--add-data=requirements-desktop.txt;.",
        "main.py"
    ]
    
    print("Building executable...")
    result = subprocess.run(cmd)
    
    if result.returncode == 0:
        print("✓ Executable built successfully!")
        print("Find Singularity.exe in the 'dist' folder")
    else:
        print("✗ Build failed")

if __name__ == "__main__":
    build_executable()