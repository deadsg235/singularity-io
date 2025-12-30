from fastapi import APIRouter, HTTPException, Depends, Header
from datetime import datetime, timedelta
import json
import os
import random
from typing import Dict, List, Any
import time

# Import access control
try:
    from access_control import require_access
except ImportError:
    # Fallback if access control not available
    def require_access(feature: str):
        def dependency(wallet_address: str = Header(None, alias="X-Wallet-Address")):
            return wallet_address
        return dependency

router = APIRouter(prefix="/api/guardian", tags=["guardian"])

# Simple data store that updates on each request
class GuardianData:
    def __init__(self):
        self.start_time = time.time()
        self.base_metrics = {
            "totalActions": 1247,
            "blockedActions": 23,
            "humanApprovals": 7,
            "ethicalViolations": 3,
            "blockedIPs": 12,
            "firewallRules": 8,
            "suspiciousActivities": 5,
            "exfiltrationAlerts": 1
        }
        self.activities = []
        
    def get_current_metrics(self):
        # Add random increments each time
        current = self.base_metrics.copy()
        elapsed = time.time() - self.start_time
        
        # Gradually increase metrics over time
        current["totalActions"] += int(elapsed / 10)  # +1 every 10 seconds
        if random.random() < 0.1:
            current["blockedActions"] += 1
        if random.random() < 0.05:
            current["ethicalViolations"] += 1
        if random.random() < 0.2:
            current["suspiciousActivities"] += 1
            
        # Calculate uptime
        uptime_hours = elapsed / 3600
        current["uptime"] = min(99.9, 95.0 + (uptime_hours * 0.1))
        
        return current
        
    def get_activities(self):
        # Generate new activities occasionally
        if random.random() < 0.3:
            activities = [
                ("health", "System health check completed"),
                ("tunnel", "WireGuard tunnel verified"),
                ("security", "Security scan completed"),
                ("approved", "AI action approved"),
                ("blocked", "Suspicious activity blocked")
            ]
            activity_type, message = random.choice(activities)
            new_activity = {
                "type": activity_type,
                "message": message,
                "timestamp": int(time.time() * 1000)
            }
            self.activities.insert(0, new_activity)
            self.activities = self.activities[:15]  # Keep last 15
            
        return self.activities
        
    def get_tunnels(self):
        tunnels = [
            {"name": "singularity-tunnel", "status": "active"},
            {"name": "backup-tunnel", "status": "active"},
            {"name": "restricted-tunnel", "status": "blocked"}
        ]
        
        # Randomly change status occasionally
        if random.random() < 0.05:
            tunnel = random.choice(tunnels[:2])  # Don't change restricted
            tunnel["status"] = "blocked" if tunnel["status"] == "active" else "active"
            
        active = [t for t in tunnels if t["status"] == "active"]
        blocked = [t for t in tunnels if t["status"] == "blocked"]
        
        return {
            "active": active,
            "blocked": blocked,
            "totalTraffic": f"{random.randint(20, 50) / 10:.1f} GB"
        }
        
    def get_ai_systems(self):
        base_actions = {"wireguard-ai": 47, "traffic-monitor": 156, "security-scanner": 89, "policy-enforcer": 234}
        elapsed = int((time.time() - self.start_time) / 5)  # Increment every 5 seconds
        
        return {
            system: {"actions": base + elapsed + random.randint(0, 5)}
            for system, base in base_actions.items()
        }

# Global instance
guardian_data = GuardianData()

@router.get("/overview")
async def get_overview(wallet_address: str = Depends(require_access("guardian_premium"))):
    try:
        metrics = guardian_data.get_current_metrics()
        total = metrics["totalActions"]
        
        return {
            "totalActions": metrics["totalActions"],
            "blockedActions": metrics["blockedActions"],
            "humanApprovals": metrics["humanApprovals"],
            "ethicalViolations": metrics["ethicalViolations"],
            "uptime": metrics["uptime"],
            "riskDistribution": {
                "low": int(total * 0.72),
                "moderate": int(total * 0.19),
                "high": int(total * 0.07),
                "critical": int(total * 0.02)
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activity")
async def get_activity():
    try:
        return guardian_data.get_activities()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/tunnels")
async def get_tunnels():
    try:
        return guardian_data.get_tunnels()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/security")
async def get_security():
    try:
        metrics = guardian_data.get_current_metrics()
        return {
            "blockedIPs": metrics["blockedIPs"],
            "firewallRules": metrics["firewallRules"],
            "suspiciousActivities": metrics["suspiciousActivities"],
            "exfiltrationAlerts": metrics["exfiltrationAlerts"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ai-systems")
async def get_ai_systems():
    try:
        return guardian_data.get_ai_systems()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))