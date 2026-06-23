from __future__ import annotations

import asyncio
import json
import logging
import os
import urllib.error
import urllib.request
from typing import Any, Dict, List


SAFETY_DISCLAIMER = "内容仅供健康科普和报告理解参考，不能替代医生诊断。"
logger = logging.getLogger("medical_reports.ai")


class AiServiceError(Exception):
    pass


def get_ai_config() -> Dict[str, Any]:
    api_key = os.getenv("AI_API_KEY", "").strip()
    base_url_raw = os.getenv("AI_API_BASE_URL", "").strip()
    base_url = base_url_raw or "https://api.openai.com/v1"
    model = os.getenv("AI_MODEL", "").strip()
    key_present = bool(api_key)
    return {
        "configured": bool(api_key and model),
        "hasKey": key_present,
        "key_present": key_present,
        "baseUrlConfigured": bool(base_url_raw),
        "model": model,
        "provider": "custom",
        "baseUrl": base_url,
        "api_base_url": base_url,
    }


def log_ai_error(error: Exception) -> None:
    config = get_ai_config()
    logger.warning(
        "AI provider error type=%s message=%s api_base_url=%s model=%s key_present=%s",
        type(error).__name__,
        str(error)[:200],
        config["api_base_url"],
        config["model"],
        bool(config["key_present"]),
    )


def _chat_completions_url(base_url: str) -> str:
    base = (base_url or "https://api.openai.com/v1").rstrip("/")
    return base if base.endswith("/chat/completions") else f"{base}/chat/completions"


def _request_llm_sync(messages: List[Dict[str, str]], response_format: Dict[str, str] | None = None) -> str:
    api_key = os.getenv("AI_API_KEY", "").strip()
    model = os.getenv("AI_MODEL", "").strip()
    base_url = os.getenv("AI_API_BASE_URL", "https://api.openai.com/v1").strip()
    if not api_key:
        raise AiServiceError("AI_API_KEY is not configured")
    if not model:
        raise AiServiceError("AI_MODEL is not configured")

    payload: Dict[str, Any] = {
        "model": model,
        "messages": messages,
        "temperature": 0.2,
    }
    if response_format:
        payload["response_format"] = response_format

    request = urllib.request.Request(
        _chat_completions_url(base_url),
        data=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")[:600]
        raise AiServiceError(f"AI provider HTTP {error.code}: {detail}") from error
    except (urllib.error.URLError, TimeoutError) as error:
        raise AiServiceError(f"AI provider request failed: {error}") from error

    try:
        data = json.loads(raw)
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError, json.JSONDecodeError) as error:
        raise AiServiceError("AI provider returned an unexpected response") from error


async def call_llm(messages: List[Dict[str, str]], response_format: Dict[str, str] | None = None) -> str:
    try:
        return await asyncio.to_thread(_request_llm_sync, messages, response_format)
    except AiServiceError:
        raise
    except Exception as error:
        raise AiServiceError(f"AI provider failed: {error}") from error


def report_to_compact_text(report: Dict[str, Any]) -> str:
    items = report.get("items") or []
    lines = [
        f"报告类型：{report.get('reportType', '')}",
        f"医院：{report.get('hospital', '')}",
        f"日期：{report.get('date', '')}",
        "检验项目：",
    ]
    for item in items:
        ref = item.get("refText") or f"{item.get('refLow', '')}-{item.get('refHigh', '')}"
        lines.append(
            f"- {item.get('name', '')}: {item.get('value', '')} {item.get('unit', '')}, "
            f"参考范围 {ref}, 状态 {item.get('status', '')}"
        )
    return "\n".join(lines)


INTERPRET_SYSTEM_PROMPT = f"""
你是医疗检验报告解释助手，不是医生。
只能基于用户提供的报告数据解释，不能做正式诊断，不能开药，不能给具体治疗方案，不能说“你一定患有某病”。
遇到严重异常、持续异常、症状、用药、诊断问题时，应建议咨询医生。
所有输出必须包含安全声明：{SAFETY_DISCLAIMER}
请输出严格 JSON，不要输出 Markdown。
JSON 结构：
{{
  "summary": "...",
  "abnormalItems": [
    {{
      "name": "...",
      "valueText": "...",
      "referenceText": "...",
      "statusText": "偏高/偏低/正常",
      "category": "...",
      "explanation": "...",
      "suggestion": "..."
    }}
  ],
  "normalNote": "...",
  "recommendations": ["...", "..."],
  "disclaimer": "{SAFETY_DISCLAIMER}"
}}
""".strip()


CHAT_SYSTEM_PROMPT = f"""
你是医疗检验报告解释助手，不是医生。
只能基于用户提供的报告数据回答。不能做正式诊断，不能开药，不能给具体治疗方案，不能说“你一定患有某病”。
回答要简洁、分点、引用具体项目值、单位和参考范围，避免恐吓式表达和绝对诊断。
遇到严重异常、持续异常、症状、用药、诊断问题时，应建议咨询医生。
每次回答末尾必须包含：{SAFETY_DISCLAIMER}
""".strip()


async def generate_ai_interpretation(report: Dict[str, Any]) -> Dict[str, Any]:
    content = await call_llm(
        [
            {"role": "system", "content": INTERPRET_SYSTEM_PROMPT},
            {"role": "user", "content": f"请解读这份报告：\n{report_to_compact_text(report)}"},
        ],
        response_format={"type": "json_object"},
    )
    try:
        result = json.loads(content)
    except json.JSONDecodeError as error:
        raise AiServiceError("AI interpretation response is not valid JSON") from error
    result["disclaimer"] = result.get("disclaimer") or SAFETY_DISCLAIMER
    return result


async def generate_ai_chat_reply(report: Dict[str, Any], question: str, messages: List[Dict[str, Any]]) -> str:
    history = [
        {"role": "assistant" if message.get("role") == "assistant" else "user", "content": str(message.get("content", ""))}
        for message in (messages or [])[-8:]
        if message.get("content")
    ]
    content = await call_llm(
        [
            {"role": "system", "content": CHAT_SYSTEM_PROMPT},
            {"role": "user", "content": f"当前报告数据：\n{report_to_compact_text(report)}"},
            *history,
            {"role": "user", "content": question},
        ]
    )
    return content if SAFETY_DISCLAIMER in content else f"{content}\n\n{SAFETY_DISCLAIMER}"
