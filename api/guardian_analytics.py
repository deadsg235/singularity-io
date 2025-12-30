from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
import json
import os
import random
from typing import Dict, List, Any
import asyncio
import time

router = APIRouter(prefix="/api/guardian", tags=["guardian"])

# Global data store with actual changing values
class LiveGuardianData:
    def __init__(self):
        self.start_time = time.time()
        self.metrics = {
            "totalActions": 1247,
            "blockedActions": 23,
            "humanApprovals": 7,
            "ethicalViolations": 3,
            "uptime": 99.8,
            "blockedIPs": 12,
            "firewallRules": 8,
            "suspiciousActivities": 5,
            "exfiltrationAlerts": 1
        }
        self.activities = []
        self.tunnels = [
            {"name": "singularity-tunnel", "status": "active"},
            {"name": "backup-tunnel", "status": "active"},
            {"name": "restricted-tunnel", "status": "blocked"}
        ]
        self.ai_systems = {
            "wireguard-ai": {"actions": 47},
            "traffic-monitor": {"actions": 156},
            "security-scanner": {"actions": 89},
            "policy-enforcer": {"actions": 234}
        }
        
    def update_metrics(self):
        # Increment metrics randomly
        if random.random() < 0.3:
            self.metrics["totalActions"] += random.randint(1, 5)
        if random.random() < 0.1:
            self.metrics["blockedActions"] += 1
            self.add_activity("blocked", "AI Action Blocked: suspicious behavior")
        if random.random() < 0.05:
            self.metrics["ethicalViolations"] += 1
            self.add_activity("ethics", "Ethics violation detected")
        if random.random() < 0.2:
            self.metrics["suspiciousActivities"] += 1
            
        # Update AI system actions
        for system in self.ai_systems:
            self.ai_systems[system]["actions"] += random.randint(0, 3)
            
        # Update uptime
        uptime_hours = (time.time() - self.start_time) / 3600
        self.metrics["uptime"] = min(99.9, 95.0 + (uptime_hours * 0.1))
        
    def add_activity(self, activity_type: str, message: str):
        activity = {
            "type": activity_type,
            "message": message,
            "timestamp": int(time.time() * 1000)
        }
        self.activities.insert(0, activity)
        self.activities = self.activities[:20]  # Keep last 20
        
    def get_risk_distribution(self):
        total = self.metrics["totalActions"]
        return {
            "low": int(total * 0.72),
            "moderate": int(total * 0.19),
            "high": int(total * 0.07),
            "critical": int(total * 0.02)
        }

# Global instance
live_data = LiveGuardianData()

# Background task to update data
async def update_data_continuously():
    while True:
        live_data.update_metrics()
        await asyncio.sleep(2)  # Update every 2 seconds

# Start background task
asyncio.create_task(update_data_continuously())

@router.get("/overview")
async def get_overview():
    return {
        **live_data.metrics,
        "riskDistribution": live_data.get_risk_distribution()
    }

@router.get("/activity")
async def get_activity():
    # Add random activities
    if random.random() < 0.4:
        activities = [
            ("health", "System health check completed"),
            ("tunnel", "WireGuard tunnel status verified"),
            ("security", "Security scan completed"),
            ("approved", "AI action approved")
        ]
        activity_type, message = random.choice(activities)
        live_data.add_activity(activity_type, message)
    
    return live_data.activities

@router.get("/tunnels")
async def get_tunnels():
    # Randomly change tunnel status
    if random.random() < 0.1:
        tunnel = random.choice(live_data.tunnels)
        if tunnel["name"] != "restricted-tunnel":
            tunnel["status"] = "blocked" if tunnel["status"] == "active" else "active"
    
    active = [t for t in live_data.tunnels if t["status"] == "active"]
    blocked = [t for t in live_data.tunnels if t["status"] == "blocked"]
    
    return {
        "active": active,
        "blocked": blocked,
        "totalTraffic": f"{random.randint(20, 50) / 10:.1f} GB"
    }

@router.get("/security")
async def get_security():
    return {
        "blockedIPs": live_data.metrics["blockedIPs"],
        "firewallRules": live_data.metrics["firewallRules"],
        "suspiciousActivities": live_data.metrics["suspiciousActivities"],
        "exfiltrationAlerts": live_data.metrics["exfiltrationAlerts"]
    }

@router.get("/ai-systems")
async def get_ai_systems():
    return live_data.ai_systems