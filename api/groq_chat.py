"""
groq_chat.py — Server-side Groq proxy for Singularity.io.

Keeps GROQ_API_KEY on the server. The frontend calls /api/ai/chat
instead of hitting Groq directly, so the key is never in the browser bundle.

Endpoints:
  POST /api/ai/chat        — streaming SSE chat (ULTIMA, trading assistant)
  POST /api/ai/query       — same, X402-gated alias for premium access
  GET  /api/ai/health      — confirms Groq key is configured
"""

from __future__ import annotations

import json
import logging
import os
from typing import AsyncIterator, List, Optional

import httpx
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")


# ── Models ────────────────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    system: Optional[str] = None
    stream: bool = True
    max_tokens: int = 4096
    temperature: float = 0.8


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_key() -> str:
    key = os.getenv("GROQ_API_KEY", "")
    if not key:
        raise HTTPException(status_code=503, detail="AI service not configured — GROQ_API_KEY missing")
    return key


async def _stream_groq(payload: dict) -> AsyncIterator[str]:
    """Yield SSE-formatted chunks from Groq streaming response."""
    key = _get_key()
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST", GROQ_API_URL,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json=payload,
        ) as resp:
            if resp.status_code != 200:
                body = await resp.aread()
                raise HTTPException(status_code=resp.status_code, detail=body.decode())
            async for line in resp.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data = line[6:].strip()
                if data == "[DONE]":
                    yield "data: [DONE]\n\n"
                    return
                try:
                    chunk = json.loads(data)
                    text = chunk["choices"][0]["delta"].get("content", "")
                    if text:
                        yield f"data: {json.dumps({'text': text})}\n\n"
                except (json.JSONDecodeError, KeyError, IndexError):
                    continue


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/health")
def ai_health() -> dict:
    configured = bool(os.getenv("GROQ_API_KEY"))
    return {"status": "ok" if configured else "degraded", "groq_configured": configured, "model": GROQ_MODEL}


@router.post("/chat")
async def chat(req: ChatRequest) -> StreamingResponse:
    """
    Streaming SSE chat proxy. Frontend sends messages here instead of
    calling Groq directly, keeping the API key server-side.

    Response: text/event-stream
    Each chunk: data: {"text": "..."}\n\n
    Final:      data: [DONE]\n\n
    """
    messages = []
    if req.system:
        messages.append({"role": "system", "content": req.system})
    messages.extend(m.model_dump() for m in req.messages)

    payload = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": req.temperature,
        "max_tokens": req.max_tokens,
        "stream": True,
    }

    return StreamingResponse(
        _stream_groq(payload),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


# X402-gated alias — middleware handles the 402 before this runs
@router.post("/query")
async def query(req: ChatRequest) -> StreamingResponse:
    return await chat(req)
