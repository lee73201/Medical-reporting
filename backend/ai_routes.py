from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter
from pydantic import BaseModel, Field

from .ai_service import (
    AiServiceError,
    generate_ai_chat_reply,
    generate_ai_interpretation,
    get_ai_config,
)
from .schemas import Report


router = APIRouter(prefix="/api/ai", tags=["ai"])


class InterpretRequest(BaseModel):
    report: Report


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    report: Report
    messages: List[ChatMessage] = Field(default_factory=list)
    question: str


@router.get("/health")
def ai_health() -> Dict[str, Any]:
    config = get_ai_config()
    if not config["hasKey"]:
        return {
            "ok": False,
            "configured": False,
            "provider": config["provider"],
            "model": config["model"],
            "baseUrlConfigured": config["baseUrlConfigured"],
            "hasKey": False,
            "message": "AI_API_KEY is not configured",
        }
    if not config["model"]:
        return {
            "ok": False,
            "configured": False,
            "provider": config["provider"],
            "model": "",
            "baseUrlConfigured": config["baseUrlConfigured"],
            "hasKey": True,
            "message": "AI_MODEL is not configured",
        }
    return {
        "ok": True,
        "configured": True,
        "provider": config["provider"],
        "model": config["model"],
        "baseUrlConfigured": config["baseUrlConfigured"],
        "hasKey": True,
    }


@router.post("/interpret")
async def interpret(payload: InterpretRequest) -> Dict[str, Any]:
    try:
        result = await generate_ai_interpretation(payload.report.model_dump())
        return {"ok": True, "mode": "ai", "result": result}
    except AiServiceError as error:
        return {"ok": False, "mode": "fallback", "error": str(error)}


@router.post("/chat")
async def chat(payload: ChatRequest) -> Dict[str, Any]:
    try:
        reply = await generate_ai_chat_reply(
            payload.report.model_dump(),
            payload.question,
            [message.model_dump() for message in payload.messages],
        )
        return {"ok": True, "mode": "ai", "reply": reply}
    except AiServiceError as error:
        return {"ok": False, "mode": "fallback", "error": str(error)}
