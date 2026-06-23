from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter
from pydantic import BaseModel, Field

from .ai_service import (
    AiServiceError,
    generate_ai_chat_reply,
    generate_ai_interpretation,
    get_ai_config,
    log_ai_error,
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
    response = {
        "ok": bool(config["configured"]),
        "configured": bool(config["configured"]),
        "provider": config["provider"],
        "api_base_url": config["api_base_url"],
        "model": config["model"],
        "key_present": bool(config["key_present"]),
        "baseUrlConfigured": config["baseUrlConfigured"],
        "hasKey": bool(config["key_present"]),
    }
    if not config["key_present"]:
        response["message"] = "AI_API_KEY is not configured"
    elif not config["model"]:
        response["message"] = "AI_MODEL is not configured"
    return response


@router.post("/interpret")
async def interpret(payload: InterpretRequest) -> Dict[str, Any]:
    try:
        result = await generate_ai_interpretation(payload.report.model_dump())
        return {"ok": True, "mode": "ai", "fallback": False, "result": result}
    except AiServiceError as error:
        log_ai_error(error)
        return {"ok": False, "mode": "fallback", "fallback": True, "error": str(error)[:200]}


@router.post("/chat")
async def chat(payload: ChatRequest) -> Dict[str, Any]:
    try:
        reply = await generate_ai_chat_reply(
            payload.report.model_dump(),
            payload.question,
            [message.model_dump() for message in payload.messages],
        )
        return {"ok": True, "mode": "ai", "fallback": False, "reply": reply}
    except AiServiceError as error:
        log_ai_error(error)
        return {"ok": False, "mode": "fallback", "fallback": True, "error": str(error)[:200]}
