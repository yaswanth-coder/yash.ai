import os
import json
import time
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, AsyncGenerator
from app.services.providers.base import AIProvider, ProviderModel, ProviderHealth
from app.core.config import settings


class NvidiaProvider(AIProvider):
    """
    NVIDIA NIM (Inference Microservice) Provider.
    Connects to NVIDIA API Catalog (OpenAI-compatible) at https://integrate.api.nvidia.com/v1.
    """

    def __init__(self):
        super().__init__(name="nvidia", is_local=False)
        self.api_url = "https://integrate.api.nvidia.com/v1/chat/completions"
        self.default_models = [
            ProviderModel(
                id="nvidia:meta/llama-3.3-70b-instruct",
                name="NVIDIA (Meta Llama 3.3 70B)",
                context_window=128000,
                description="NVIDIA NIM accelerated Llama 3.3 reasoning",
            ),
            ProviderModel(
                id="nvidia:deepseek-ai/deepseek-r1",
                name="NVIDIA (DeepSeek R1)",
                context_window=128000,
                description="Leading open reasoning model hosted on NVIDIA NIM",
            ),
            ProviderModel(
                id="nvidia:nvidia/llama-3.1-nemotron-70b-instruct",
                name="NVIDIA (Nemotron 70B)",
                context_window=128000,
                description="NVIDIA custom fine-tuned high-accuracy model",
            ),
            ProviderModel(
                id="nvidia:mistralai/mixtral-8x7b-instruct-v0.1",
                name="NVIDIA (Mixtral 8x7B)",
                context_window=32768,
                description="NVIDIA high-throughput MoE model",
            ),
        ]

    def _get_api_key(self) -> str:
        from dotenv import dotenv_values
        root_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env")
        backend_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "apps", "backend", ".env")

        vals = {}
        if os.path.exists(root_env):
            vals.update(dotenv_values(root_env))
        if os.path.exists(backend_env):
            vals.update(dotenv_values(backend_env))

        return (
            vals.get("NVIDIA_API_KEY")
            or os.getenv("NVIDIA_API_KEY")
            or getattr(settings, "NVIDIA_API_KEY", "")
        )

    def is_configured(self) -> bool:
        key = self._get_api_key()
        return bool(key and len(key) > 5)

    async def health_check(self) -> ProviderHealth:
        now_str = datetime.now(timezone.utc).isoformat()
        if not self.is_configured():
            return ProviderHealth(
                status="DISABLED",
                last_checked=now_str,
                error_message="NVIDIA_API_KEY not configured",
            )

        start = time.perf_counter()
        try:
            headers = {
                "Authorization": f"Bearer {self._get_api_key()}",
                "Accept": "application/json",
            }
            payload = {
                "model": "meta/llama-3.3-70b-instruct",
                "messages": [{"role": "user", "content": "ping"}],
                "max_tokens": 5,
            }
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.post(self.api_url, headers=headers, json=payload)
                if res.status_code == 200:
                    elapsed_ms = (time.perf_counter() - start) * 1000
                    self.status = "ONLINE"
                    return ProviderHealth(
                        status="ONLINE",
                        latency_ms=round(elapsed_ms, 2),
                        last_checked=now_str,
                    )
                elif res.status_code == 429:
                    self.status = "RATE_LIMITED"
                    return ProviderHealth(
                        status="RATE_LIMITED",
                        last_checked=now_str,
                        error_message="NVIDIA API rate limit or quota exceeded",
                    )
                elif res.status_code in (401, 403):
                    self.status = "DISABLED"
                    return ProviderHealth(
                        status="DISABLED",
                        last_checked=now_str,
                        error_message="Invalid NVIDIA_API_KEY",
                    )
                else:
                    self.status = "DEGRADED"
                    return ProviderHealth(
                        status="DEGRADED",
                        last_checked=now_str,
                        error_message=f"HTTP {res.status_code}",
                    )
        except Exception as e:
            self.status = "OFFLINE"
            return ProviderHealth(
                status="OFFLINE",
                last_checked=now_str,
                error_message=str(e)[:120],
            )

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
                messages.append(
                    {
                        "role": turn.get("role", "user"),
                        "content": turn.get("content", ""),
                    }
                )

        user_content = message
        if file_info and file_info.get("type") == "text":
            user_content = f"File Context:\n```\n{file_info.get('content', '')}\n```\n\n{message}"

        messages.append({"role": "user", "content": user_content})
        return messages

    async def generate_response(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        file_info: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None,
        **kwargs,
    ) -> str:
        if not self.is_configured():
            raise RuntimeError("NVIDIA API key not configured")

        target_model = model.replace("nvidia:", "") if model else "meta/llama-3.3-70b-instruct"
        headers = {
            "Authorization": f"Bearer {self._get_api_key()}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        payload = {
            "model": target_model,
            "messages": self._format_messages(message, history, system_prompt, file_info),
            "temperature": 0.7,
            "max_tokens": 4096,
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            res = await client.post(self.api_url, headers=headers, json=payload)
            if res.status_code != 200:
                if res.status_code == 429:
                    self.status = "RATE_LIMITED"
                raise RuntimeError(f"NVIDIA API error {res.status_code}: {res.text}")
            data = res.json()
            return data["choices"][0]["message"]["content"]

    async def stream_response(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        file_info: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None,
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        if not self.is_configured():
            raise RuntimeError("NVIDIA API key not configured")

        target_model = model.replace("nvidia:", "") if model else "meta/llama-3.3-70b-instruct"
        headers = {
            "Authorization": f"Bearer {self._get_api_key()}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }
        payload = {
            "model": target_model,
            "messages": self._format_messages(message, history, system_prompt, file_info),
            "temperature": 0.7,
            "max_tokens": 4096,
            "stream": True,
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream("POST", self.api_url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    raise RuntimeError(f"NVIDIA stream error {response.status_code}")
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        raw = line[6:].strip()
                        if raw == "[DONE]":
                            break
                        try:
                            chunk = json.loads(raw)
                            delta = chunk["choices"][0].get("delta", {}).get("content", "")
                            if delta:
                                yield delta
                        except Exception:
                            continue
