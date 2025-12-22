"""S-IO Protocol FastAPI Middleware"""
import json
import base64
from typing import Callable, Optional, Dict, Any
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from .sio_protocol import (
    SIOProtocolHandler,
    SIOPaymentRequirements,
    SIOPaymentPayload,
    decode_sio_payment,
    SIO_HEADER_NAME,
    SIO_RESPONSE_HEADER
)


class SIOMiddleware:
    """FastAPI middleware for S-IO protocol payment gating"""
    
    def __init__(
        self,
        sio_token_mint: str = "SioTkQxHyAs98ouRiyi1YDv3gLMSrX3eNBg61GH9xMd",
        treasury_wallet: str = "SioTreasury1234567890123456789012345678901"
    ):
        self.handler = SIOProtocolHandler(sio_token_mint, treasury_wallet)
    
    def require_sio_payment(
        self,
        amount: str,
        description: str = "",
        timeout: int = 60,
        paths: Optional[list] = None
    ):
        """Decorator for requiring SIO payment on endpoints"""
        def decorator(func):
            async def wrapper(request: Request, *args, **kwargs):
                # Check if path matches (if specified)
                if paths and request.url.path not in paths:
                    return await func(request, *args, **kwargs)
                
                # Get resource URL
                resource_url = str(request.url)
                
                # Create payment requirements
                requirements = self.handler.create_payment_requirements(
                    amount=amount,
                    resource=resource_url,
                    description=description,
                    timeout=timeout
                )
                
                # Check for payment header
                payment_header = request.headers.get(SIO_HEADER_NAME)
                if not payment_header:
                    return self._payment_required_response(requirements)
                
                # Decode and verify payment
                try:
                    payload = decode_sio_payment(payment_header)
                    verification = self.handler.verify_payment(payload, requirements)
                    
                    if not verification.get("valid"):
                        return self._payment_error_response(
                            verification.get("error", "Payment verification failed")
                        )
                    
                    # Execute the protected function
                    response = await func(request, *args, **kwargs)
                    
                    # Settle payment after successful execution
                    settlement = self.handler.settle_payment(payload, requirements)
                    
                    if settlement.success:
                        # Add settlement proof to response headers
                        settlement_data = base64.b64encode(
                            settlement.model_dump_json().encode()
                        ).decode()
                        response.headers[SIO_RESPONSE_HEADER] = settlement_data
                    
                    return response
                    
                except Exception as e:
                    return self._payment_error_response(f"Payment processing error: {str(e)}")
            
            return wrapper
        return decorator
    
    def _payment_required_response(self, requirements: SIOPaymentRequirements) -> JSONResponse:
        """Return 402 Payment Required response"""
        return JSONResponse(
            status_code=402,
            content={
                "error": "SIO payment required",
                "protocol": "s-io",
                "requirements": requirements.model_dump()
            },
            headers={"Content-Type": "application/json"}
        )
    
    def _payment_error_response(self, error: str) -> JSONResponse:
        """Return payment error response"""
        return JSONResponse(
            status_code=402,
            content={
                "error": error,
                "protocol": "s-io"
            },
            headers={"Content-Type": "application/json"}
        )


# Global middleware instance
sio_middleware = SIOMiddleware()


def require_sio_payment(
    amount: str,
    description: str = "",
    timeout: int = 60,
    paths: Optional[list] = None
):
    """Convenience function for requiring SIO payment"""
    return sio_middleware.require_sio_payment(amount, description, timeout, paths)


# Example usage decorator
def sio_protected(amount: str, description: str = ""):
    """Simple decorator for SIO payment protection"""
    def decorator(func):
        return require_sio_payment(amount, description)(func)
    return decorator