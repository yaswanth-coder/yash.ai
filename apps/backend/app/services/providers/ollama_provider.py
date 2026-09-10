import os
import json
import time
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, AsyncGenerator
from app.services.providers.base import AIProvider, ProviderModel, ProviderHealth


class OllamaProvider(AIProvider):
    def __init__(self):
        super().__init__(name="ollama", is_local=True)
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://127.0.0.1:11434").rstrip("/")
        self.cached_default_model = None

    def is_configured(self) -> bool:
        return True

    async def _get_installed_model_names(self) -> List[str]:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    return [m.get("name") for m in data.get("models", []) if m.get("name")]
        except Exception:
            pass
        return []

    async def health_check(self) -> ProviderHealth:
        now_str = datetime.now(timezone.utc).isoformat()
        start = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    elapsed_ms = (time.perf_counter() - start) * 1000
                    self.status = "ONLINE"
                    return ProviderHealth(status="ONLINE", latency_ms=round(elapsed_ms, 2), last_checked=now_str)
                else:
                    self.status = "DEGRADED"
                    return ProviderHealth(status="DEGRADED", last_checked=now_str, error_message=f"HTTP {res.status_code}")
        except Exception as e:
            self.status = "OFFLINE"
            return ProviderHealth(status="OFFLINE", last_checked=now_str, error_message="Ollama daemon is offline")

    async def get_models(self) -> List[ProviderModel]:
        models = []
        try:
            names = await self._get_installed_model_names()
            for m_name in names:
                models.append(
                    ProviderModel(
                        id=f"ollama:{m_name}",
                        name=f"Ollama ({m_name})",
                        context_window=131072 if "3.2" in m_name else 32768,
                        description=f"Local Ollama Model: {m_name}",
                        is_local=True,
                    )
                )
        except Exception:
            pass

        if not models:
            models = [
                ProviderModel(id="ollama:llama3.2:latest", name="Ollama (Llama 3.2)", context_window=131072, description="Local Llama 3.2", is_local=True),
                ProviderModel(id="ollama:qwen2.5:1.5b", name="Ollama (Qwen 2.5)", context_window=32768, description="Local Qwen 2.5", is_local=True),
            ]
        return models

    async def _resolve_model(self, requested_model: Optional[str]) -> str:
        if requested_model:
            cleaned = requested_model.replace("ollama:", "")
            if cleaned and cleaned != "default":
                return cleaned

        installed = await self._get_installed_model_names()
        if installed:
            return installed[0]
        return os.getenv("OLLAMA_MODEL", "llama3.2:latest")

    def _prepare_payload(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        file_info: Optional[Dict[str, Any]] = None,
        target_model: str = "llama3.2:latest",
        stream: bool = False,
    ) -> Dict[str, Any]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        if history:
            for turn in history:
                messages.append({"role": turn.get("role", "user"), "content": turn.get("content", "")})

        user_content = message
        if file_info and file_info.get("type") == "text":
            user_content = f"File Context:\n```\n{file_info.get('content', '')}\n```\n\n{message}"

        messages.append({"role": "user", "content": user_content})

        return {
            "model": target_model,
            "messages": messages,
            "stream": stream,
        }

    async def generate_response(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        file_info: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> str:
        target_model = await self._resolve_model(model)
        payload = self._prepare_payload(message, history, system_prompt, file_info, target_model, stream=False)
        async with httpx.AsyncClient(timeout=120.0) as client:
            res = await client.post(f"{self.base_url}/api/chat", json=payload)
            if res.status_code != 200:
                raise RuntimeError(f"Ollama error {res.status_code}: {res.text}")
            data = res.json()
            return data.get("message", {}).get("content", "")

    async def stream_response(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        file_info: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        target_model = await self._resolve_model(model)
        payload = self._prepare_payload(message, history, system_prompt, file_info, target_model, stream=True)
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream("POST", f"{self.base_url}/api/chat", json=payload) as response:
                if response.status_code != 200:
                    raise RuntimeError(f"Ollama stream error {response.status_code}")
                async for line in response.aiter_lines():
                    if line:
                        try:
                            chunk = json.loads(line)
                            content = chunk.get("message", {}).get("content", "")
                            if content:
                                yield content
                        except Exception:
                            continue
