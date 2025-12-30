from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import time
import json

router = APIRouter(prefix="/api/access", tags=["access-control"])

# S-IO Token Contract Address
SIO_TOKEN_ADDRESS = "Fuj6EDWQHBnQ3eEvYDujNQ4rPLSkhm3pBySbQ79Bpump"

class UserSubscription(BaseModel):
    wallet_address: str
    tier: str
    expires_at: int
    api_calls_remaining: int
    features_unlocked: List[str]

class AccessRequest(BaseModel):
    wallet_address: str
    feature: str
    amount: Optional[float] = None

# User subscriptions database
user_subscriptions: Dict[str, UserSubscription] = {}

# Service tiers and features
SERVICE_TIERS = {
    "free": {
        "price": 0,
        "api_calls": 10,
        "features": ["basic_analytics"],
        "duration": 30 * 24 * 3600  # 30 days
    },
    "basic": {
        "price": 100000,
        "api_calls": 1000,
        "features": ["basic_analytics", "neural_network_access", "guardian_basic"],
        "duration": 30 * 24 * 3600
    },
    "pro": {
        "price": 750000,
        "api_calls": 10000,
        "features": ["basic_analytics", "neural_network_access", "premium_analytics", "guardian_premium", "ai_trading_signals"],
        "duration": 30 * 24 * 3600
    },
    "enterprise": {
        "price": 2500000,
        "api_calls": -1,  # Unlimited
        "features": ["all"],
        "duration": 30 * 24 * 3600
    }
}

FEATURE_PRICES = {
    "neural_network_access": 100000,
    "premium_analytics": 250000,
    "ai_trading_signals": 500000,
    "guardian_premium": 150000,
    "ai_model_training": 1000000,
    "enterprise_support": 5000000
}

def get_user_subscription(wallet_address: str) -> UserSubscription:
    """Get user subscription or create free tier"""
    if wallet_address not in user_subscriptions:
        user_subscriptions[wallet_address] = UserSubscription(
            wallet_address=wallet_address,
            tier="free",
            expires_at=int(time.time()) + SERVICE_TIERS["free"]["duration"],
            api_calls_remaining=SERVICE_TIERS["free"]["api_calls"],
            features_unlocked=SERVICE_TIERS["free"]["features"]
        )
    return user_subscriptions[wallet_address]

def check_access(wallet_address: str, feature: str) -> bool:
    """Check if user has access to feature"""
    subscription = get_user_subscription(wallet_address)
    
    # Check if subscription expired
    if subscription.expires_at < time.time():
        # Reset to free tier
        subscription.tier = "free"
        subscription.features_unlocked = SERVICE_TIERS["free"]["features"]
        subscription.api_calls_remaining = SERVICE_TIERS["free"]["api_calls"]
        subscription.expires_at = int(time.time()) + SERVICE_TIERS["free"]["duration"]
    
    # Check feature access
    if "all" in subscription.features_unlocked or feature in subscription.features_unlocked:
        # Check API calls limit
        if subscription.api_calls_remaining > 0 or subscription.api_calls_remaining == -1:
            if subscription.api_calls_remaining > 0:
                subscription.api_calls_remaining -= 1
            return True
    
    return False

@router.get("/subscription/{wallet_address}")
async def get_subscription(wallet_address: str):
    """Get user subscription details"""
    subscription = get_user_subscription(wallet_address)
    return {
        "wallet_address": subscription.wallet_address,
        "tier": subscription.tier,
        "expires_at": subscription.expires_at,
        "api_calls_remaining": subscription.api_calls_remaining,
        "features_unlocked": subscription.features_unlocked,
        "days_remaining": max(0, (subscription.expires_at - int(time.time())) // (24 * 3600))
    }

@router.post("/upgrade")
async def upgrade_subscription(wallet_address: str, tier: str):
    """Upgrade user subscription tier"""
    if tier not in SERVICE_TIERS:
        raise HTTPException(status_code=400, detail="Invalid tier")
    
    tier_info = SERVICE_TIERS[tier]
    subscription = get_user_subscription(wallet_address)
    
    # Update subscription
    subscription.tier = tier
    subscription.expires_at = int(time.time()) + tier_info["duration"]
    subscription.api_calls_remaining = tier_info["api_calls"]
    subscription.features_unlocked = tier_info["features"]
    
    return {
        "status": "upgraded",
        "tier": tier,
        "price": tier_info["price"],
        "expires_at": subscription.expires_at
    }

@router.post("/check-access")
async def check_feature_access(request: AccessRequest):
    """Check if user has access to specific feature"""
    has_access = check_access(request.wallet_address, request.feature)
    subscription = get_user_subscription(request.wallet_address)
    
    return {
        "has_access": has_access,
        "feature": request.feature,
        "current_tier": subscription.tier,
        "api_calls_remaining": subscription.api_calls_remaining,
        "required_payment": FEATURE_PRICES.get(request.feature, 0) if not has_access else 0
    }

@router.get("/tiers")
async def get_service_tiers():
    """Get all available service tiers"""
    return {
        "tiers": SERVICE_TIERS,
        "features": FEATURE_PRICES
    }

@router.post("/pay-for-feature")
async def pay_for_feature(wallet_address: str, feature: str):
    """Pay for individual feature access"""
    if feature not in FEATURE_PRICES:
        raise HTTPException(status_code=400, detail="Invalid feature")
    
    subscription = get_user_subscription(wallet_address)
    
    # Add feature to user's unlocked features
    if feature not in subscription.features_unlocked:
        subscription.features_unlocked.append(feature)
    
    # Extend expiration by 30 days for this feature
    subscription.expires_at = max(subscription.expires_at, int(time.time()) + 30 * 24 * 3600)
    
    return {
        "status": "feature_unlocked",
        "feature": feature,
        "price": FEATURE_PRICES[feature],
        "expires_at": subscription.expires_at
    }

# Dependency for protected endpoints
async def require_access(
    feature: str,
    wallet_address: Optional[str] = Header(None, alias="X-Wallet-Address")
):
    """Dependency to require feature access"""
    if not wallet_address:
        raise HTTPException(status_code=401, detail="Wallet address required")
    
    if not check_access(wallet_address, feature):
        subscription = get_user_subscription(wallet_address)
        required_payment = FEATURE_PRICES.get(feature, 0)
        
        raise HTTPException(
            status_code=402,
            detail={
                "error": "Payment required",
                "feature": feature,
                "current_tier": subscription.tier,
                "required_payment": required_payment,
                "upgrade_options": SERVICE_TIERS
            }
        )
    
    return wallet_address