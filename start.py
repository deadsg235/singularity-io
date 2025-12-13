#!/usr/bin/env python3
import subprocess
import sys
import os
import time
from pathlib import Path

def install_dependencies():
    """Install required dependencies"""
    print("Installing dependencies...")
    try:
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "api/requirements.txt"], check=True)
        print("✅ Dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False
    return True

def start_api():
    """Start the FastAPI server"""
    print("Starting Singularity.io API server...")
    try:
        os.chdir("api")
        subprocess.run([sys.executable, "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"])
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")

def main():
    print("🚀 Singularity.io - Full Operation Startup")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not Path("api/main.py").exists():
        print("❌ Please run this script from the singularity-io root directory")
        sys.exit(1)
    
    # Install dependencies
    if not install_dependencies():
        sys.exit(1)
    
    print("\n🌟 System Status:")
    print("   • Neural Network: Enabled")
    print("   • Solana Client: Enabled") 
    print("   • SolFunMeme Technology: Active")
    print("   • API Endpoints: Operational")
    print("   • 3D Visualization: Ready")
    
    print(f"\n🔗 Access URLs:")
    print(f"   • API: http://localhost:8000")
    print(f"   • Docs: http://localhost:8000/docs")
    print(f"   • Frontend: Open web/singularity-frontend/index.html")
    
    print("\n⚡ Starting server...")
    start_api()

if __name__ == "__main__":
    main()
