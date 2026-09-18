import os
import json
import time
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, AsyncGenerator
from app.services.providers.base import AIProvider, ProviderModel, ProviderHealth


class GroqProvider(AIProvider):
    def __init__(self):
        super().__init__(name="groq", is_local=False)
        self.api_url = "https://api.groq.com/openai/v1/chat/completions"
        self.default_models = [
            ProviderModel(id="groq:qwen/qwen3.8-27b", name="Groq (Qwen 3.8 27B)", context_window=128000, description="Ultra-fast Groq LPU inference"),
            ProviderModel(id="groq:openai/gpt-oss-20b", name="Groq (GPT OSS 20B)", context_window=128000, description="Fast open-weights reasoning on Groq LPU"),
            ProviderModel(id="groq:groq/compound-mini", name="Groq (Compound Mini)", context_window=128000, description="Instant lightweight Groq model"),
        ]

    def _get_api_key(self) -> str:
        return os.getenv("GROQ_API_KEY", "")

    def is_configured(self) -> bool:
        key = self._get_api_key()
        return bool(key and len(key) > 5)

    async def health_check(self) -> ProviderHealth:
        now_str = datetime.now(timezone.utc).isoformat()
        if not self.is_configured():
            return ProviderHealth(status="DISABLED", last_checked=now_str, error_message="GROQ_API_KEY not configured")

        start = time.perf_counter()
        try:
            headers = {"Authorization": f"Bearer {self._get_api_key()}"}
            payload = {
                "model": "qwen/qwen3.8-27b",
                "messages": [{"role": "user", "content": "ping"}],
                "max_tokens": 5,
            }
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.post(self.api_url, headers=headers, json=payload)
                if res.status_code == 200:
                    elapsed_ms = (time.perf_counter() - start) * 1000
                    self.status = "ONLINE"
                    return ProviderHealth(status="ONLINE", latency_ms=round(elapsed_ms, 2), last_checked=now_str)
                elif res.status_code == 429:
                    self.status = "RATE_LIMITED"
                    return ProviderHealth(status="RATE_LIMITED", last_checked=now_str, error_message="Groq rate limit reached")
                else:
                    self.status = "DEGRADED"
                    return ProviderHealth(status="DEGRADED", last_checked=now_str, error_message=f"HTTP {res.status_code}")
        except Exception as e:
            self.status = "OFFLINE"
            return ProviderHealth(status="OFFLINE", last_checked=now_str, error_message=str(e)[:120])

    async def get_models(self) -> List[ProviderModel]:
        return self.default_models

    def _format_messages(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        file_info: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, str]]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        if history:
            for turn in history:
                messages.append({"role": turn.get("role", "user"), "content": turn.get("content", "")})

        user_text = message
        if file_info and file_info.get("type") == "text":
            user_text = f"File Context:\n```\n{file_info.get('content', '')}\n```\n\n{message}"

        messages.append({"role": "user", "content": user_text})
        return messages

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
            raise RuntimeError("Groq API key not configured")

        target_model = model.replace("groq:", "") if model else "qwen/qwen3.8-27b"
        candidate_models = [target_model, "qwen/qwen3.8-27b", "openai/gpt-oss-20b", "groq/compound-mini"]
        candidate_models = list(dict.fromkeys(candidate_models))

        headers = {
            "Authorization": f"Bearer {self._get_api_key()}",
            "Content-Type": "application/json",
        }
        messages = self._format_messages(message, history, system_prompt, file_info)

        last_error = None
        for m in candidate_models:
            payload = {
                "model": m,
                "messages": messages,
                "temperature": 0.7,
            }
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    res = await client.post(self.api_url, headers=headers, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        return data["choices"][0]["message"]["content"]
                    elif res.status_code == 429:
                        self.status = "RATE_LIMITED"
                        last_error = RuntimeError("Groq rate limit reached (429)")
                    else:
                        last_error = RuntimeError(f"Groq error {res.status_code}: {res.text}")
            except Exception as e:
                last_error = e
                continue

        raise last_error or RuntimeError("Groq failed to return a response")

    async def stream_response(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        file_info: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        if not self.is_configured():
            raise RuntimeError("Groq API key not configured")

        target_model = model.replace("groq:", "") if model else "qwen/qwen3.8-27b"
        candidate_models = [target_model, "qwen/qwen3.8-27b", "openai/gpt-oss-20b", "groq/compound-mini"]
        candidate_models = list(dict.fromkeys(candidate_models))

        headers = {
            "Authorization": f"Bearer {self._get_api_key()}",
            "Content-Type": "application/json",
        }
        messages = self._format_messages(message, history, system_prompt, file_info)

        stream_succeeded = False
        for m in candidate_models:
            payload = {
                "model": m,
                "messages": messages,
                "temperature": 0.7,
                "stream": True,
            }
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    async with client.stream("POST", self.api_url, headers=headers, json=payload) as response:
                        if response.status_code != 200:
                            continue
                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                raw = line[6:].strip()
                                if raw == "[DONE]":
                                    stream_succeeded = True
                                    break
                                try:
                                    chunk = json.loads(raw)
                                    delta = chunk["choices"][0].get("delta", {}).get("content", "")
                                    if delta:
                                        stream_succeeded = True
                                        yield delta
                                except Exception:
                                    continue
                        if stream_succeeded:
                            return
            except Exception:
                continue
