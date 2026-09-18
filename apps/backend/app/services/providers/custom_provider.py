import os
import json
import logging
import httpx
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, AsyncGenerator
from app.services.providers.base import AIProvider, ProviderModel, ProviderHealth
from app.services.custom_model_service import get_custom_models, get_custom_model_by_id
from app.core.config import settings

logger = logging.getLogger("yash.ai.custom_provider")


class CustomProvider(AIProvider):
    """
    OpenAI-compatible Custom Model Provider.
    Dynamically routes to user-added custom models and optional xKiro / xAI configurations.
    """

    def __init__(self):
        super().__init__(name="custom", is_local=False)

    def _get_xkiro_key(self) -> str:
        from dotenv import dotenv_values
        root_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env")
        vals = dotenv_values(root_env) if os.path.exists(root_env) else {}
        return (
            vals.get("XKIRO_API_KEY")
            or os.getenv("XKIRO_API_KEY")
            or getattr(settings, "XKIRO_API_KEY", "")
        )

    def _get_xkiro_base_url(self) -> str:
        from dotenv import dotenv_values
        root_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env")
        vals = dotenv_values(root_env) if os.path.exists(root_env) else {}
        return (
            vals.get("XKIRO_BASE_URL")
            or os.getenv("XKIRO_BASE_URL")
            or getattr(settings, "XKIRO_BASE_URL", "https://api.xkiro.com/v1")
        ).rstrip("/")

    def is_configured(self) -> bool:
        # True if xkiro key is set or if custom models exist
        return bool(self._get_xkiro_key()) or True

    async def health_check(self) -> ProviderHealth:
        now_str = datetime.now(timezone.utc).isoformat()
        models = await self.get_models()
        if not models:
            return ProviderHealth(status="ONLINE", last_checked=now_str)
        return ProviderHealth(status="ONLINE", last_checked=now_str)

    async def get_models(self) -> List[ProviderModel]:
        res: List[ProviderModel] = []

        # 1. Built-in xKiro if key is set
        xkiro_key = self._get_xkiro_key()
        if xkiro_key:
            res.append(
                ProviderModel(
                    id="xkiro:default",
                    name="xKiro AI",
                    context_window=128000,
                    description="High-performance model via xKiro API",
                )
            )

        # 2. Dynamically loaded user custom models
        try:
            custom_list = await get_custom_models(mask_keys=True)
            for cm in custom_list:
                res.append(
                    ProviderModel(
                        id=cm["model_id"],
                        name=f"Custom: {cm['name']}",
                        context_window=cm.get("context_window", 128000),
                        description=cm.get("description", f"Custom model ({cm['model_id']})"),
                    )
                )
        except Exception as ex:
            logger.debug(f"Could not load custom models for list: {ex}")

        return res

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
                    {"role": turn.get("role", "user"), "content": turn.get("content", "")}
                )

        user_content = message
        if file_info and file_info.get("type") == "text":
            user_content = f"File Context:\n```\n{file_info.get('content', '')}\n```\n\n{message}"

        messages.append({"role": "user", "content": user_content})
        return messages

    async def _resolve_model_config(self, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Find base_url, api_key, and target model name."""
        m_id = (model_id or "").strip()

        # 1. Default fallback to xKiro if key is set
        if not m_id or m_id in ["default", "custom", "custom:default", "xkiro", "xkiro:default"]:
            key = self._get_xkiro_key()
            if key:
                base_url = self._get_xkiro_base_url()
                target_model = "qwen/qwen3.7-flash:free"
                return {"base_url": base_url, "api_key": key, "target_model": target_model}

        # 2. Explicit xKiro model
        if m_id.startswith("xkiro:"):
            key = self._get_xkiro_key()
            if not key:
                raise RuntimeError("XKIRO_API_KEY is not configured in .env")
            base_url = self._get_xkiro_base_url()
            target_model = m_id.replace("xkiro:", "") or "qwen/qwen3.7-flash:free"
            if target_model == "default":
                target_model = "qwen/qwen3.7-flash:free"
            return {"base_url": base_url, "api_key": key, "target_model": target_model}

        # 3. Check custom model database
        cm = await get_custom_model_by_id(m_id)
        if cm:
            target_model = cm["model_id"].replace("custom:", "")
            return {
                "base_url": cm["base_url"],
                "api_key": cm["api_key"],
                "target_model": target_model,
            }

        # 4. Fallback if xKiro is available
        key = self._get_xkiro_key()
        if key:
            base_url = self._get_xkiro_base_url()
            return {"base_url": base_url, "api_key": key, "target_model": "qwen/qwen3.7-flash:free"}

        raise RuntimeError(f"Custom model '{model_id}' not found in registry")

    async def generate_response(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        file_info: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None,
        **kwargs,
    ) -> str:
        cfg = await self._resolve_model_config(model)
        base_url = cfg["base_url"]
        api_url = base_url if base_url.endswith("/chat/completions") else f"{base_url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {cfg['api_key']}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        candidate_models = [cfg["target_model"], "qwen/qwen3.7-flash:free", "minimax/minimax-m2.5:free"]
        candidate_models = list(dict.fromkeys(candidate_models))

        messages = self._format_messages(message, history, system_prompt, file_info)
        last_err = None

        for m in candidate_models:
            payload = {
                "model": m,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 4096,
            }
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    res = await client.post(api_url, headers=headers, json=payload)
                    if res.status_code == 200:
                        data = res.json()
                        return data["choices"][0]["message"]["content"]
                    else:
                        last_err = RuntimeError(f"Custom model error {res.status_code}: {res.text}")
            except Exception as e:
                last_err = e
                continue

        raise last_err or RuntimeError("Custom model failed to respond")

    async def stream_response(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        file_info: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None,
        **kwargs,
    ) -> AsyncGenerator[str, None]:
        cfg = await self._resolve_model_config(model)
        base_url = cfg["base_url"]
        api_url = base_url if base_url.endswith("/chat/completions") else f"{base_url}/chat/completions"

        headers = {
            "Authorization": f"Bearer {cfg['api_key']}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }
        candidate_models = [cfg["target_model"], "qwen/qwen3.7-flash:free", "minimax/minimax-m2.5:free"]
        candidate_models = list(dict.fromkeys(candidate_models))

        messages = self._format_messages(message, history, system_prompt, file_info)
        stream_succeeded = False

        for m in candidate_models:
            payload = {
                "model": m,
                "messages": messages,
                "temperature": 0.7,
                "max_tokens": 4096,
                "stream": True,
            }
            try:
                async with httpx.AsyncClient(timeout=60.0) as client:
                    async with client.stream("POST", api_url, headers=headers, json=payload) as response:
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
