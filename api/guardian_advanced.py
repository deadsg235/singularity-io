from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from datetime import datetime, timedelta
import json
import asyncio
import random
from typing import Dict, List, Any, Set
from dataclasses import dataclass, asdict

router = APIRouter(prefix="/api/guardian", tags=["guardian"])

@dataclass
class ThreatEvent:
    id: str
    type: str
    severity: str
    source: str
    target: str
    description: str
    timestamp: datetime
    mitigated: bool = False

@dataclass
class AIBehaviorPattern:
    ai_id: str
    pattern_type: str
    frequency: int
    risk_score: float
    last_seen: datetime

class AdvancedGuardianStore:
    def __init__(self):
        self.start_time = datetime.now()
        self.connected_clients: Set[WebSocket] = set()
        self.threat_events: List[ThreatEvent] = []
        self.ai_patterns: Dict[str, List[AIBehaviorPattern]] = {}
        self.network_topology = {
            "nodes": ["guardian-core", "wireguard-bridge", "ai-monitor", "threat-detector"],
            "connections": [
                {"from": "guardian-core", "to": "wireguard-bridge", "status": "active"},
                {"from": "guardian-core", "to": "ai-monitor", "status": "active"},
                {"from": "ai-monitor", "to": "threat-detector", "status": "active"}
            ]
        }
        self.performance_metrics = {
            "response_time_ms": [],
            "memory_usage_mb": [],
            "cpu_usage_percent": [],
            "network_throughput_mbps": []
        }
        
    async def add_threat_event(self, event: ThreatEvent):
        self.threat_events.insert(0, event)
        self.threat_events = self.threat_events[:100]  # Keep last 100
        await self.broadcast_event("threat_detected", asdict(event))
        
    async def analyze_ai_behavior(self, ai_id: str, action_type: str):
        if ai_id not in self.ai_patterns:
            self.ai_patterns[ai_id] = []
            
        # Find existing pattern or create new
        pattern = next((p for p in self.ai_patterns[ai_id] if p.pattern_type == action_type), None)
        if pattern:
            pattern.frequency += 1
            pattern.last_seen = datetime.now()
            pattern.risk_score = min(1.0, pattern.frequency / 100)
        else:
            pattern = AIBehaviorPattern(
                ai_id=ai_id,
                pattern_type=action_type,
                frequency=1,
                risk_score=0.01,
                last_seen=datetime.now()
            )
            self.ai_patterns[ai_id].append(pattern)
            
        # Check for anomalies
        if pattern.frequency > 50 and pattern.risk_score > 0.7:
            await self.add_threat_event(ThreatEvent(
                id=f"ai-anomaly-{datetime.now().timestamp()}",
                type="ai_behavior_anomaly",
                severity="high",
                source=ai_id,
                target="system",
                description=f"Unusual behavior pattern detected: {action_type}",
                timestamp=datetime.now()
            ))
            
    async def broadcast_event(self, event_type: str, data: Dict):
        if self.connected_clients:
            message = json.dumps({"type": event_type, "data": data})
            disconnected = set()
            for client in self.connected_clients:
                try:
                    await client.send_text(message)
                except:
                    disconnected.add(client)
            self.connected_clients -= disconnected
            
    def update_performance_metrics(self):
        # Simulate performance data
        self.performance_metrics["response_time_ms"].append(random.randint(10, 100))
        self.performance_metrics["memory_usage_mb"].append(random.randint(200, 800))
        self.performance_metrics["cpu_usage_percent"].append(random.randint(20, 80))
        self.performance_metrics["network_throughput_mbps"].append(random.randint(50, 200))
        
        # Keep last 50 measurements
        for key in self.performance_metrics:
            self.performance_metrics[key] = self.performance_metrics[key][-50:]

guardian_store = AdvancedGuardianStore()

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    guardian_store.connected_clients.add(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        guardian_store.connected_clients.discard(websocket)

@router.get("/threats")
async def get_threats():
    """Get recent threat events"""
    return [asdict(event) for event in guardian_store.threat_events]

@router.get("/ai-behavior")
async def get_ai_behavior():
    """Get AI behavior patterns"""
    result = {}
    for ai_id, patterns in guardian_store.ai_patterns.items():
        result[ai_id] = [asdict(pattern) for pattern in patterns]
    return result

@router.get("/network-topology")
async def get_network_topology():
    """Get network topology"""
    return guardian_store.network_topology

@router.get("/performance")
async def get_performance():
    """Get performance metrics"""
    guardian_store.update_performance_metrics()
    return guardian_store.performance_metrics

@router.post("/simulate-threat")
async def simulate_threat(threat_type: str = "malware", severity: str = "medium"):
    """Simulate a threat event"""
    threat = ThreatEvent(
        id=f"threat-{datetime.now().timestamp()}",
        type=threat_type,
        severity=severity,
        source=f"external-{random.randint(1000, 9999)}",
        target="guardian-system",
        description=f"Simulated {threat_type} threat detected",
        timestamp=datetime.now()
    )
    await guardian_store.add_threat_event(threat)
    return {"status": "threat_simulated", "threat_id": threat.id}

@router.post("/ai-action")
async def log_ai_action(ai_id: str, action_type: str, description: str = ""):
    """Log AI action for behavior analysis"""
    await guardian_store.analyze_ai_behavior(ai_id, action_type)
    return {"status": "logged", "ai_id": ai_id, "action": action_type}