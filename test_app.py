#!/usr/bin/env python3
"""
Test script for Singularity.io application
"""

import sys
import importlib.util

def test_imports():
    """Test all required imports"""
    modules = [
        'tkinter', 'threading', 'time', 'random', 
        'datetime', 'pathlib', 'json', 'subprocess'
    ]
    
    failed = []
    for module in modules:
        try:
            __import__(module)
            print(f"✅ {module}")
        except ImportError:
            print(f"❌ {module}")
            failed.append(module)
    
    return len(failed) == 0

def test_main_syntax():
    """Test main.py syntax"""
    try:
        with open('main.py', 'r') as f:
            compile(f.read(), 'main.py', 'exec')
        print("✅ main.py syntax valid")
        return True
    except Exception as e:
        print(f"❌ main.py syntax error: {e}")
        return False

def test_wallet_bridge():
    """Test wallet bridge module"""
    try:
        spec = importlib.util.spec_from_file_location("wallet_bridge", "wallet_bridge.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        print("✅ wallet_bridge.py loads")
        return True
    except Exception as e:
        print(f"❌ wallet_bridge.py error: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing Singularity.io Application")
    print("=" * 40)
    
    tests = [
        test_imports(),
        test_main_syntax(),
        test_wallet_bridge()
    ]
    
    if all(tests):
        print("\n✅ All tests passed!")
        return 0
    else:
        print("\n❌ Some tests failed!")
        return 1

if __name__ == "__main__":
    sys.exit(main())