from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List
from datetime import datetime, timedelta

router = APIRouter(prefix="/api/services", tags=["Services"])

class Service(BaseModel):
    id: str
    name: str
    description: str
    price_sio: float
    duration_days: int
    features: List[str]
    category: str

class ServiceCatalog(BaseModel):
    services: List[Service]
    categories: List[str]

# Service definitions
SERVICES = [
    Service(
        id="neural_basic",
        name="Neural Network Basic",
        description="Access to basic AI predictions and analysis",
        price_sio=100000,
        duration_days=30,
        features=["Basic predictions", "Market analysis", "Real-time data"],
        category="AI"
    ),
    Service(
        id="neural_advanced",
        name="Neural Network Advanced",
        description="Advanced AI with custom model training",
        price_sio=500000,
        duration_days=30,
        features=["Custom models", "Advanced predictions", "Priority processing"],
        category="AI"
    ),
    Service(
        id="guardian_premium",
        name="Guardian Premium",
        description="Advanced security monitoring and threat detection",
        price_sio=250000,
        duration_days=30,
        features=["Real-time monitoring", "Threat intelligence", "Custom alerts"],
        category="Security"
    ),
    Service(
        id="analytics_pro",
        name="Analytics Pro",
        description="Professional analytics dashboard with custom metrics",
        price_sio=150000,
        duration_days=30,
        features=["Custom dashboards", "Export data", "API access"],
        category="Analytics"
    ),
    Service(
        id="blockchain_access",
        name="Blockchain Access",
        description="Direct access to Singularity blockchain features",
        price_sio=750000,
        duration_days=90,
        features=["Transaction processing", "Smart contracts", "Node access"],
        category="Blockchain"
    ),
    Service(
        id="enterprise_suite",
        name="Enterprise Suite",
        description="Complete access to all Singularity.io features",
        price_sio=2000000,
        duration_days=365,
        features=["All features", "Priority support", "Custom integrations"],
        category="Enterprise"
    )
]

@router.get("/catalog")
async def get_service_catalog():
    categories = list(set(service.category for service in SERVICES))
    return ServiceCatalog(services=SERVICES, categories=categories)

@router.get("/category/{category}")
async def get_services_by_category(category: str):
    filtered = [s for s in SERVICES if s.category.lower() == category.lower()]
    if not filtered:
        raise HTTPException(404, f"No services found in category: {category}")
    return filtered

@router.get("/service/{service_id}")
async def get_service_details(service_id: str):
    service = next((s for s in SERVICES if s.id == service_id), None)
    if not service:
        raise HTTPException(404, f"Service not found: {service_id}")
    return service

@router.get("/pricing")
async def get_pricing_tiers():
    return {
        "basic": {"min_sio": 100000, "services": ["neural_basic", "analytics_pro"]},
        "professional": {"min_sio": 500000, "services": ["neural_advanced", "guardian_premium"]},
        "enterprise": {"min_sio": 2000000, "services": ["enterprise_suite", "blockchain_access"]}
    }

@router.post("/validate-access")
async def validate_service_access(wallet: str, service_id: str):
    # This would integrate with sio_protocol to check unlocked services
    from .sio_protocol import unlocked_services
    
    key = f"{wallet}_{service_id}"
    if key in unlocked_services:
        service = unlocked_services[key]
        if service["expires_at"] > datetime.now():
            return {"access": True, "expires_at": service["expires_at"]}
    
    return {"access": False, "message": "Service not unlocked or expired"}