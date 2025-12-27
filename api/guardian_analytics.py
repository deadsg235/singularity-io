from fastapi import APIRouter, HTTPException
from datetime import datetime, timedelta
import json
import os
import random
from typing import Dict, List, Any

router = APIRouter(prefix="/api/guardian", tags=["guardian"])

# Real-time data store with dynamic updates
class GuardianDataStore:
    def __init__(self):
        self.start_time = datetime.now()
        self.base_data = {
            "totalActions": 1247,
            "blockedActions": 23,
            "humanApprovals": 7,
            "ethicalViolations": 3,
            "uptime": 99.8
        }
        self.activity_log = []
        self.tunnels = {
            "singularity-tunnel": {"status": "active", "traffic": 0, "created": datetime.now()},
            "backup-tunnel": {"status": "active", "traffic": 0, "created": datetime.now()},
            "restricted-tunnel": {"status": "blocked", "traffic": 0, "created": datetime.now()}
        }
        self.security_metrics = {
            "blockedIPs": 12,
            "firewallRules": 8,
            "suspiciousActivities": 5,
            "exfiltrationAlerts": 1
        }

    def get_real_time_overview(self) -> Dict[str, Any]:
        # Simulate real-time changes
        uptime_hours = (datetime.now() - self.start_time).total_seconds() / 3600
        
        # Add random increments to simulate activity
        if random.random() < 0.3:  # 30% chance of new activity
            self.base_data["totalActions"] += random.randint(1, 5)
            
        if random.random() < 0.1:  # 10% chance of blocked action
            self.base_data["blockedActions"] += 1
            self.add_real_time_activity("blocked", "AI Action Blocked: suspicious behavior detected")
            
        if random.random() < 0.05:  # 5% chance of ethical violation
            self.base_data["ethicalViolations"] += 1
            self.add_real_time_activity("ethics", "Ethics Violation: transparency principle breached")

        # Calculate risk distribution based on current data
        total = self.base_data["totalActions"]
        risk_dist = {
            "low": int(total * 0.72),
            "moderate": int(total * 0.19),
            "high": int(total * 0.07),
            "critical": int(total * 0.02)
        }

        return {
            **self.base_data,
            "uptime": min(99.9, 95.0 + (uptime_hours * 0.1)),
            "riskDistribution": risk_dist
        }

    def add_real_time_activity(self, activity_type: str, message: str):
        activity = {
            "type": activity_type,
            "message": message,
            "timestamp": int(datetime.now().timestamp() * 1000)
        }
        self.activity_log.insert(0, activity)
        self.activity_log = self.activity_log[:50]  # Keep last 50

    def get_real_time_activity(self) -> List[Dict[str, Any]]:
        # Add periodic system activities
        if random.random() < 0.2:
            activities = [
                ("health", "System Health Check: All components operational"),
                ("tunnel", "WireGuard Tunnel: Traffic analysis completed"),
                ("security", "Security Scan: No threats detected"),
                ("approved", "AI Action Approved: data analysis request"),
                ("alert", "Traffic Alert: Bandwidth usage within limits")
            ]
            activity_type, message = random.choice(activities)
            self.add_real_time_activity(activity_type, message)
            
        return self.activity_log

    def get_real_time_tunnels(self) -> Dict[str, Any]:
        # Update tunnel traffic in real-time
        total_traffic = 0
        active_count = 0
        blocked_count = 0
        
        for tunnel_name, tunnel_data in self.tunnels.items():
            if tunnel_data["status"] == "active":
                # Simulate traffic growth
                tunnel_data["traffic"] += random.randint(10, 100)  # MB
                total_traffic += tunnel_data["traffic"]
                active_count += 1
            else:
                blocked_count += 1
                
        # Simulate tunnel status changes
        if random.random() < 0.02:  # 2% chance of status change
            tunnel_name = random.choice(list(self.tunnels.keys()))
            if self.tunnels[tunnel_name]["status"] == "active":
                self.tunnels[tunnel_name]["status"] = "blocked"
                self.add_real_time_activity("alert", f"Tunnel {tunnel_name} blocked due to suspicious activity")
            elif tunnel_name != "restricted-tunnel":  # Don't unblock restricted
                self.tunnels[tunnel_name]["status"] = "active"
                self.add_real_time_activity("approved", f"Tunnel {tunnel_name} reactivated")

        active_tunnels = []
        blocked_tunnels = []
        
        for name, data in self.tunnels.items():
            tunnel_info = {
                "name": name,
                "status": data["status"],
                "traffic": f"{data['traffic'] / 1000:.1f} GB" if data["traffic"] > 1000 else f"{data['traffic']} MB"
            }
            
            if data["status"] == "active":
                active_tunnels.append(tunnel_info)
            else:
                blocked_tunnels.append(tunnel_info)

        return {
            "active": active_tunnels,
            "blocked": blocked_tunnels,
            "totalTraffic": f"{total_traffic / 1000:.1f} GB" if total_traffic > 1000 else f"{total_traffic} MB"
        }

    def get_real_time_security(self) -> Dict[str, Any]:
        # Simulate security metric changes
        if random.random() < 0.1:  # 10% chance of security event
            event_type = random.choice(["blocked_ip", "firewall_rule", "suspicious_activity", "exfiltration_alert"])
            
            if event_type == "blocked_ip":
                self.security_metrics["blockedIPs"] += 1
                self.add_real_time_activity("security", f"IP blocked: {random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}")
            elif event_type == "suspicious_activity":
                self.security_metrics["suspiciousActivities"] += 1
                self.add_real_time_activity("alert", "Suspicious activity detected: unusual traffic pattern")
            elif event_type == "exfiltration_alert":
                self.security_metrics["exfiltrationAlerts"] += 1
                self.add_real_time_activity("alert", "Data exfiltration attempt blocked")
                
        return self.security_metrics

# Global store instance
guardian_store = GuardianDataStore()

@router.get("/overview")
async def get_overview():
    """Get real-time system overview metrics"""
    return guardian_store.get_real_time_overview()

@router.get("/activity")
async def get_activity():
    """Get real-time activity log"""
    return guardian_store.get_real_time_activity()

@router.get("/tunnels")
async def get_tunnels():
    """Get real-time WireGuard tunnel status"""
    return guardian_store.get_real_time_tunnels()

@router.get("/security")
async def get_security():
    """Get real-time security metrics"""
    return guardian_store.get_real_time_security()

@router.get("/ai-systems")
async def get_ai_systems():
    """Get real-time AI system status"""
    # Simulate AI system activity
    systems = {
        "wireguard-ai": {"actions": 47 + random.randint(0, 10), "status": "active"},
        "traffic-monitor": {"actions": 156 + random.randint(0, 20), "status": "active"},
        "security-scanner": {"actions": 89 + random.randint(0, 15), "status": "active"},
        "policy-enforcer": {"actions": 234 + random.randint(0, 25), "status": "active"}
    }
    return systems

@router.post("/simulate-event")
async def simulate_event(event_type: str, message: str = None):
    """Simulate a Guardian event for testing"""
    if not message:
        messages = {
            "blocked": "AI Action Blocked: unauthorized system access",
            "alert": "Security Alert: unusual network activity",
            "approved": "AI Action Approved: data analysis request",
            "ethics": "Ethics Check: potential bias detected",
            "tunnel": "Tunnel Event: new connection established"
        }
        message = messages.get(event_type, "System event occurred")
    
    guardian_store.add_real_time_activity(event_type, message)
    return {"status": "success", "event": event_type, "message": message}

@router.get("/health")
async def health_check():
    """Health check with real-time status"""
    uptime_seconds = (datetime.now() - guardian_store.start_time).total_seconds()
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "uptime_seconds": uptime_seconds,
        "service": "Higher Guardian Analytics API",
        "version": "1.0.0"
    }