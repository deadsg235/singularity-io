import json
import os
from typing import Dict, Any, List, Optional
from datetime import datetime
from dataclasses import dataclass, asdict
from pathlib import Path

@dataclass
class GuardianConfig:
    # AI Oversight Settings
    max_daily_actions: int = 10000
    ethical_threshold: float = 0.7
    auto_block_threshold: float = 0.9
    human_approval_threshold: float = 0.8
    
    # Network Security Settings
    max_connections_per_ip: int = 100
    ddos_threshold: int = 10000
    port_scan_threshold: int = 100
    data_exfiltration_ratio: float = 10.0
    
    # WireGuard Settings
    max_tunnels: int = 50
    traffic_limit_gb: float = 100.0
    tunnel_timeout_hours: int = 24
    allowed_endpoints: List[str] = None
    
    # Performance Settings
    refresh_interval_ms: int = 5000
    max_log_entries: int = 1000
    cache_ttl_seconds: int = 300
    
    # Alert Settings
    email_notifications: bool = True
    webhook_url: Optional[str] = None
    alert_cooldown_minutes: int = 15
    
    def __post_init__(self):
        if self.allowed_endpoints is None:
            self.allowed_endpoints = ["singularity.io", "localhost"]

class ConfigManager:
    def __init__(self, config_path: str = "guardian_config.json"):
        self.config_path = Path(config_path)
        self.config = GuardianConfig()
        self.load_config()
        
    def load_config(self) -> bool:
        """Load configuration from file"""
        try:
            if self.config_path.exists():
                with open(self.config_path, 'r') as f:
                    data = json.load(f)
                    # Update config with loaded data
                    for key, value in data.items():
                        if hasattr(self.config, key):
                            setattr(self.config, key, value)
                return True
        except Exception as e:
            print(f"Failed to load config: {e}")
        return False
        
    def save_config(self) -> bool:
        """Save configuration to file"""
        try:
            with open(self.config_path, 'w') as f:
                json.dump(asdict(self.config), f, indent=2, default=str)
            return True
        except Exception as e:
            print(f"Failed to save config: {e}")
            return False
            
    def update_config(self, updates: Dict[str, Any]) -> bool:
        """Update configuration with new values"""
        try:
            for key, value in updates.items():
                if hasattr(self.config, key):
                    setattr(self.config, key, value)
            return self.save_config()
        except Exception as e:
            print(f"Failed to update config: {e}")
            return False
            
    def get_config(self) -> Dict[str, Any]:
        """Get current configuration as dictionary"""
        return asdict(self.config)
        
    def reset_to_defaults(self) -> bool:
        """Reset configuration to default values"""
        self.config = GuardianConfig()
        return self.save_config()
        
    def validate_config(self) -> List[str]:
        """Validate configuration and return list of issues"""
        issues = []
        
        # Validate thresholds
        if not 0 <= self.config.ethical_threshold <= 1:
            issues.append("ethical_threshold must be between 0 and 1")
            
        if not 0 <= self.config.auto_block_threshold <= 1:
            issues.append("auto_block_threshold must be between 0 and 1")
            
        if self.config.auto_block_threshold <= self.config.ethical_threshold:
            issues.append("auto_block_threshold should be higher than ethical_threshold")
            
        # Validate network settings
        if self.config.max_connections_per_ip <= 0:
            issues.append("max_connections_per_ip must be positive")
            
        if self.config.ddos_threshold <= 0:
            issues.append("ddos_threshold must be positive")
            
        # Validate WireGuard settings
        if self.config.max_tunnels <= 0:
            issues.append("max_tunnels must be positive")
            
        if self.config.traffic_limit_gb <= 0:
            issues.append("traffic_limit_gb must be positive")
            
        # Validate performance settings
        if self.config.refresh_interval_ms < 1000:
            issues.append("refresh_interval_ms should be at least 1000ms")
            
        return issues
        
    def get_security_profile(self) -> str:
        """Get current security profile based on settings"""
        if (self.config.auto_block_threshold >= 0.9 and 
            self.config.ethical_threshold >= 0.8 and
            self.config.max_connections_per_ip <= 50):
            return "high_security"
        elif (self.config.auto_block_threshold >= 0.7 and 
              self.config.ethical_threshold >= 0.6):
            return "balanced"
        else:
            return "permissive"
            
    def apply_security_profile(self, profile: str) -> bool:
        """Apply predefined security profile"""
        profiles = {
            "high_security": {
                "auto_block_threshold": 0.9,
                "ethical_threshold": 0.8,
                "human_approval_threshold": 0.7,
                "max_connections_per_ip": 50,
                "ddos_threshold": 5000,
                "port_scan_threshold": 50,
                "data_exfiltration_ratio": 5.0,
                "max_tunnels": 25,
                "traffic_limit_gb": 50.0
            },
            "balanced": {
                "auto_block_threshold": 0.8,
                "ethical_threshold": 0.7,
                "human_approval_threshold": 0.8,
                "max_connections_per_ip": 100,
                "ddos_threshold": 10000,
                "port_scan_threshold": 100,
                "data_exfiltration_ratio": 10.0,
                "max_tunnels": 50,
                "traffic_limit_gb": 100.0
            },
            "permissive": {
                "auto_block_threshold": 0.7,
                "ethical_threshold": 0.6,
                "human_approval_threshold": 0.9,
                "max_connections_per_ip": 200,
                "ddos_threshold": 20000,
                "port_scan_threshold": 200,
                "data_exfiltration_ratio": 20.0,
                "max_tunnels": 100,
                "traffic_limit_gb": 200.0
            }
        }
        
        if profile in profiles:
            return self.update_config(profiles[profile])
        return False

# Global config manager instance
config_manager = ConfigManager()

def get_guardian_config() -> GuardianConfig:
    """Get current Guardian configuration"""
    return config_manager.config

def update_guardian_config(updates: Dict[str, Any]) -> bool:
    """Update Guardian configuration"""
    return config_manager.update_config(updates)

def validate_guardian_config() -> List[str]:
    """Validate current Guardian configuration"""
    return config_manager.validate_config()

def apply_security_profile(profile: str) -> bool:
    """Apply security profile to Guardian configuration"""
    return config_manager.apply_security_profile(profile)