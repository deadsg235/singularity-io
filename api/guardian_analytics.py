from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
import json
import os
from typing import Dict, List, Any

router = APIRouter(prefix="/api/guardian", tags=["guardian"])

# Mock data store - in production this would connect to the Rust Higher Guardian
class GuardianDataStore:
    def __init__(self):
        self.data = {
            "overview": {
                "totalActions": 1247,
                "blockedActions": 23,
                "humanApprovals": 7,
                "ethicalViolations": 3,
                "uptime": 99.8,
                "riskDistribution": {
                    "low": 892,
                    "moderate": 234,
                    "high": 98,
                    "critical": 23
                }
            },
            "activity": [
                {
                    "type": "blocked",
                    "message": "AI Action Blocked: network_configuration",
                    "timestamp": int((datetime.now() - timedelta(minutes=2)).timestamp() * 1000)
                },
                {
                    "type": "alert",
                    "message": "Traffic Alert: singularity-tunnel exceeded 1GB",
                    "timestamp": int((datetime.now() - timedelta(minutes=5)).timestamp() * 1000)
                },
                {
                    "type": "approved",
                    "message": "Tunnel Approved: backup-tunnel",
                    "timestamp": int((datetime.now() - timedelta(minutes=12)).timestamp() * 1000)
                },
                {
                    "type": "ethics",
                    "message": "Ethics Check: transparency violation detected",
                    "timestamp": int((datetime.now() - timedelta(minutes=18)).timestamp() * 1000)
                },
                {
                    "type": "health",
                    "message": "System Health: All systems operational",
                    "timestamp": int((datetime.now() - timedelta(minutes=25)).timestamp() * 1000)
                }
            ],
            "tunnels": {
                "active": [
                    {"name": "singularity-tunnel", "status": "active", "traffic": "1.2 GB"},
                    {"name": "backup-tunnel", "status": "active", "traffic": "0.8 GB"}
                ],
                "blocked": [
                    {"name": "restricted-tunnel", "status": "blocked", "reason": "Endpoint not whitelisted"}
                ],
                "totalTraffic": "2.4 GB"
            },
            "security": {
                "blockedIPs": 12,
                "firewallRules": 8,
                "suspiciousActivities": 5,
                "exfiltrationAlerts": 1
            },
            "aiSystems": {
                "wireguard-ai": {"actions": 47, "status": "active"},
                "traffic-monitor": {"actions": 156, "status": "active"},
                "security-scanner": {"actions": 89, "status": "active"},
                "policy-enforcer": {"actions": 234, "status": "active"}
            }
        }

    def get_overview(self) -> Dict[str, Any]:
        return self.data["overview"]

    def get_activity(self) -> List[Dict[str, Any]]:
        return self.data["activity"]

    def get_tunnels(self) -> Dict[str, Any]:
        return self.data["tunnels"]

    def get_security(self) -> Dict[str, Any]:
        return self.data["security"]

    def get_ai_systems(self) -> Dict[str, Any]:
        return self.data["aiSystems"]

    def add_activity(self, activity_type: str, message: str):
        """Add new activity to the log"""
        new_activity = {
            "type": activity_type,
            "message": message,
            "timestamp": int(datetime.now().timestamp() * 1000)
        }
        self.data["activity"].insert(0, new_activity)
        # Keep only last 50 activities
        self.data["activity"] = self.data["activity"][:50]

# Global data store instance
guardian_store = GuardianDataStore()

@router.get("/overview")
async def get_overview():
    """Get system overview metrics"""
    try:
        return guardian_store.get_overview()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get overview: {str(e)}")

@router.get("/activity")
async def get_activity():
    """Get recent activity log"""
    try:
        return guardian_store.get_activity()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get activity: {str(e)}")

@router.get("/tunnels")
async def get_tunnels():
    """Get WireGuard tunnel status"""
    try:
        return guardian_store.get_tunnels()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get tunnels: {str(e)}")

@router.get("/security")
async def get_security():
    """Get security metrics"""
    try:
        return guardian_store.get_security()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get security: {str(e)}")

@router.get("/ai-systems")
async def get_ai_systems():
    """Get AI system status"""
    try:
        return guardian_store.get_ai_systems()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get AI systems: {str(e)}")

@router.post("/activity")
async def add_activity(activity_type: str, message: str):
    """Add new activity to the log"""
    try:
        guardian_store.add_activity(activity_type, message)
        return {"status": "success", "message": "Activity added"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add activity: {str(e)}")

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "Higher Guardian Analytics API"
    }