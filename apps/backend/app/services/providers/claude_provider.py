import os
import json
import time
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, AsyncGenerator
from app.services.providers.base import AIProvider, ProviderModel, ProviderHealth


class ClaudeProvider(AIProvider):
    def __init__(self):
        super().__init__(name="anthropic", is_local=False)
        self.api_url = "https://api.anthropic.com/v1/messages"
        self.default_models = [
            ProviderModel(id="anthropic:claude-3-5-sonnet-20241022", name="Claude 3.5 Sonnet", context_window=200000, description="Anthropic's most intelligent model"),
            ProviderModel(id="anthropic:claude-3-5-haiku-20241022", name="Claude 3.5 Haiku", context_window=200000, description="Lightning-fast compact model"),
        ]

    def _get_api_key(self) -> str:
        return os.getenv("ANTHROPIC_API_KEY", "")

    def is_configured(self) -> bool:
        key = self._get_api_key()
        return bool(key and len(key) > 5)

    async def health_check(self) -> ProviderHealth:
        now_str = datetime.now(timezone.utc).isoformat()
        if not self.is_configured():
            return ProviderHealth(status="DISABLED", last_checked=now_str, error_message="ANTHROPIC_API_KEY not configured")

        start = time.perf_counter()
        try:
            headers = {
                "x-api-key": self._get_api_key(),
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            }
            payload = {
                "model": "claude-3-5-haiku-20241022",
                "max_tokens": 5,
                "messages": [{"role": "user", "content": "ping"}],
            }
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(self.api_url, headers=headers, json=payload)
                if res.status_code == 200:
                    elapsed_ms = (time.perf_counter() - start) * 1000
                    self.status = "ONLINE"
                    return ProviderHealth(status="ONLINE", latency_ms=round(elapsed_ms, 2), last_checked=now_str)
                elif res.status_code == 429:
                    self.status = "RATE_LIMITED"
                    return ProviderHealth(status="RATE_LIMITED", last_checked=now_str, error_message="Rate limit reached")
                else:
                    self.status = "DEGRADED"
                    return ProviderHealth(status="DEGRADED", last_checked=now_str, error_message=f"HTTP {res.status_code}")
        except Exception as e:
            self.status = "OFFLINE"
            return ProviderHealth(status="OFFLINE", last_checked=now_str, error_message=str(e)[:120])

    async def get_models(self) -> List[ProviderModel]:
        return self.default_models

    async def generate_response(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        file_info: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> str:
        if not self.is_configured():
            raise RuntimeError("Anthropic API key not configured")

        target_model = model.replace("anthropic:", "") if model else "claude-3-5-sonnet-20241022"
        headers = {
            "x-api-key": self._get_api_key(),
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        }

        messages = []
        if history:
            for turn in history:
                messages.append({"role": turn.get("role", "user"), "content": turn.get("content", "")})

        user_content = message
        if file_info and file_info.get("type") == "text":
            user_content = f"File Context:\n```\n{file_info.get('content', '')}\n```\n\n{message}"

        messages.append({"role": "user", "content": user_content})

        payload = {
            "model": target_model,
            "max_tokens": 4096,
            "system": system_prompt or "You are Yash.AI, an expert AI assistant.",
            "messages": messages,
        }

        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(self.api_url, headers=headers, json=payload)
            if res.status_code == 429:
                self.cooldown_until = time.time() + 60
                raise RuntimeError("Anthropic rate limited (429) — falling back to next provider.")
            if res.status_code in (503, 529):
                self.cooldown_until = time.time() + 30
                raise RuntimeError(f"Anthropic overloaded ({res.status_code}) — no capacity available, falling back.")
            if res.status_code != 200:
                raise RuntimeError(f"Anthropic error {res.status_code}: {res.text[:300]}")
            data = res.json()
            return data["content"][0]["text"]

    async def stream_response(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        file_info: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        # Fallback to generate response for stream
        full = await self.generate_response(message, history, system_prompt, file_info, model)
        yield full
