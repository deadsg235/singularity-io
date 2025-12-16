"""
System compatibility checker for Singularity.io
"""

import sys
import platform
import subprocess
import importlib.util

def check_python():
    """Check Python version and installation"""
    version = sys.version_info
    print(f"Python Version: {version.major}.{version.minor}.{version.micro}")
    
    if version < (3, 8):
        print("❌ Python 3.8+ required")
        return False
    
    print("✅ Python version compatible")
    return True

def check_pip():
    """Check if pip is available"""
    try:
        subprocess.run([sys.executable, "-m", "pip", "--version"], 
                      check=True, capture_output=True)
        print("✅ pip available")
        return True
    except subprocess.CalledProcessError:
        print("❌ pip not available")
        return False

def check_tkinter():
    """Check if tkinter is available"""
    try:
        import tkinter
        print("✅ tkinter available")
        return True
    except ImportError:
        print("❌ tkinter not available")
        return False

def check_internet():
    """Check internet connectivity"""
    try:
        import urllib.request
        urllib.request.urlopen('https://pypi.org', timeout=5)
        print("✅ Internet connection available")
        return True
    except:
        print("⚠️ Internet connection limited")
        return False

def check_system():
    """Check system compatibility"""
    print("System Information:")
    print(f"OS: {platform.system()} {platform.release()}")
    print(f"Architecture: {platform.machine()}")
    print(f"Processor: {platform.processor()}")
    print()
    
    checks = [
        check_python(),
        check_pip(),
        check_tkinter(),
        check_internet()
    ]
    
    if all(checks):
        print("\n✅ System ready for Singularity.io installation")
        return True
    else:
        print("\n❌ System requirements not met")
        return False

if __name__ == "__main__":
    print("🔍 Singularity.io System Check")
    print("=" * 35)
    
    if check_system():
        print("\nRun 'python setup.py' to install")
    else:
        print("\nPlease resolve issues above before installing")
    
    input("\nPress Enter to exit...")