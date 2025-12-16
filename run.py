#!/usr/bin/env python3
"""
Singularity.io Desktop Application Launcher
"""

import sys
import os
import subprocess

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import tkinter
        print("✓ Tkinter available")
    except ImportError:
        print("✗ Tkinter not available")
        return False
    
    return True

def build_rust_bridge():
    """Build the Rust bridge binary"""
    print("Building Rust bridge...")
    try:
        result = subprocess.run(["cargo", "build", "--release"], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("✓ Rust bridge built successfully")
            return True
        else:
            print(f"✗ Rust build failed: {result.stderr}")
            return False
    except FileNotFoundError:
        print("✗ Cargo not found. Please install Rust.")
        return False

def main():
    print("Singularity.io Desktop Application")
    print("=" * 40)
    
    if not check_dependencies():
        print("Please install required dependencies:")
        print("pip install -r requirements-desktop.txt")
        sys.exit(1)
    
    # Build Rust bridge (optional for now)
    rust_available = build_rust_bridge()
    if not rust_available:
        print("⚠ Rust bridge unavailable - some features will be limited")
    
    print("Starting application...")
    
    # Import and run the main application
    from main import SingularityApp
    app = SingularityApp()
    app.run()

if __name__ == "__main__":
    main()