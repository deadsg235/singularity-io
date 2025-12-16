"""
Singularity.io Desktop Setup Script
Handles all dependencies and configuration
"""

import os
import sys
import subprocess
import urllib.request
import zipfile
import shutil
from pathlib import Path

class SingularityInstaller:
    def __init__(self):
        self.project_dir = Path(__file__).parent
        self.python_exe = sys.executable
        
    def check_python(self):
        """Verify Python version"""
        if sys.version_info < (3, 8):
            print("❌ Python 3.8+ required")
            return False
        print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}")
        return True
    
    def install_pip_packages(self):
        """Install Python dependencies"""
        packages = [
            "tkinter",
            "requests", 
            "solana",
            "solders",
            "anchorpy",
            "base58",
            "cryptography",
            "pynacl",
            "pyinstaller"
        ]
        
        print("📦 Installing Python packages...")
        for package in packages:
            try:
                subprocess.run([
                    self.python_exe, "-m", "pip", "install", 
                    "--upgrade", package
                ], check=True, capture_output=True)
                print(f"  ✅ {package}")
            except subprocess.CalledProcessError:
                print(f"  ⚠️ {package} (optional)")
    
    def setup_rust(self):
        """Install Rust if not present"""
        try:
            subprocess.run(["cargo", "--version"], 
                         check=True, capture_output=True)
            print("✅ Rust already installed")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            print("📥 Installing Rust...")
            try:
                # Download rustup installer
                url = "https://win.rustup.rs/x86_64"
                installer = self.project_dir / "rustup-init.exe"
                urllib.request.urlretrieve(url, installer)
                
                # Run installer silently
                subprocess.run([str(installer), "-y"], check=True)
                
                # Add to PATH
                cargo_bin = Path.home() / ".cargo" / "bin"
                os.environ["PATH"] = f"{cargo_bin};{os.environ['PATH']}"
                
                print("✅ Rust installed")
                return True
            except Exception as e:
                print(f"⚠️ Rust installation failed: {e}")
                return False
    
    def build_rust_bridge(self):
        """Build Solana bridge binary"""
        if not (self.project_dir / "Cargo.toml").exists():
            print("⚠️ Cargo.toml not found, skipping Rust build")
            return False
            
        print("🔨 Building Rust bridge...")
        try:
            subprocess.run(["cargo", "build", "--release"], 
                         cwd=self.project_dir, check=True)
            print("✅ Rust bridge built")
            return True
        except subprocess.CalledProcessError:
            print("⚠️ Rust build failed (optional)")
            return False
    
    def create_shortcuts(self):
        """Create desktop and start menu shortcuts"""
        print("🔗 Creating shortcuts...")
        
        desktop = Path.home() / "Desktop"
        start_menu = Path.home() / "AppData/Roaming/Microsoft/Windows/Start Menu/Programs"
        
        shortcut_script = f'''
$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("{desktop}/Singularity.io.lnk")
$Shortcut.TargetPath = "{self.project_dir}/launch.bat"
$Shortcut.WorkingDirectory = "{self.project_dir}"
$Shortcut.IconLocation = "{self.project_dir}/icon.ico"
$Shortcut.Save()

$Shortcut2 = $WshShell.CreateShortcut("{start_menu}/Singularity.io.lnk")
$Shortcut2.TargetPath = "{self.project_dir}/launch.bat"
$Shortcut2.WorkingDirectory = "{self.project_dir}"
$Shortcut2.IconLocation = "{self.project_dir}/icon.ico"
$Shortcut2.Save()
'''
        
        try:
            subprocess.run(["powershell", "-Command", shortcut_script], 
                         check=True, capture_output=True)
            print("✅ Shortcuts created")
        except subprocess.CalledProcessError:
            print("⚠️ Shortcut creation failed")
    
    def create_icon(self):
        """Create application icon"""
        # Simple text-based icon for now
        icon_content = """
# Singularity.io Icon Placeholder
# Replace with actual .ico file
"""
        with open(self.project_dir / "icon.ico", "w") as f:
            f.write(icon_content)
    
    def verify_installation(self):
        """Test if everything works"""
        print("🧪 Verifying installation...")
        
        # Test Python imports
        test_imports = [
            "tkinter", "requests", "json", "threading", "time"
        ]
        
        for module in test_imports:
            try:
                __import__(module)
                print(f"  ✅ {module}")
            except ImportError:
                print(f"  ❌ {module}")
                return False
        
        # Test main.py syntax
        try:
            with open(self.project_dir / "main.py") as f:
                compile(f.read(), "main.py", "exec")
            print("  ✅ main.py syntax")
        except Exception as e:
            print(f"  ❌ main.py error: {e}")
            return False
        
        return True
    
    def install(self):
        """Run complete installation"""
        print("🚀 Singularity.io Desktop Installer")
        print("=" * 40)
        
        if not self.check_python():
            return False
        
        self.install_pip_packages()
        self.setup_rust()
        self.build_rust_bridge()
        self.create_icon()
        self.create_shortcuts()
        
        if self.verify_installation():
            print("\n✅ Installation complete!")
            print("🎯 Launch from desktop shortcut or run: python main.py")
            return True
        else:
            print("\n❌ Installation failed")
            return False

if __name__ == "__main__":
    installer = SingularityInstaller()
    installer.install()
    input("\nPress Enter to exit...")