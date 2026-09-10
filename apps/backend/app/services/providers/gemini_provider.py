import os
import time
import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional, AsyncGenerator
from google import genai
from google.genai import types
from app.core.config import settings
from app.services.providers.base import AIProvider, ProviderModel, ProviderHealth

logger = logging.getLogger("yash.ai.providers.gemini")


class GeminiProvider(AIProvider):
    def __init__(self):
        super().__init__(name="gemini", is_local=False)
        self.default_models = [
            ProviderModel(
                id="gemini-3.6-flash",
                name="Gemini 3.6 Flash",
                context_window=1000000,
                description="Fast, state-of-the-art flagship multimodal AI"
            ),
            ProviderModel(
                id="gemini-flash-latest",
                name="Gemini Flash Latest",
                context_window=1000000,
                description="High-speed auto-updating Gemini Flash"
            ),
        ]

    def _get_api_key(self) -> str:
        from dotenv import dotenv_values
        env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env")
        env_vals = dotenv_values(env_path) if os.path.exists(env_path) else {}
        return env_vals.get("GEMINI_API_KEY") or os.getenv("GEMINI_API_KEY") or settings.GEMINI_API_KEY

    def is_configured(self) -> bool:
        key = self._get_api_key()
        return bool(key and len(key) > 10)

    def _get_client(self) -> genai.Client:
        return genai.Client(
            api_key=self._get_api_key(),
            http_options=types.HttpOptions(timeout=20000)
        )

    async def health_check(self) -> ProviderHealth:
        now_str = datetime.now(timezone.utc).isoformat()
        if not self.is_configured():
            return ProviderHealth(status="DISABLED", last_checked=now_str, error_message="GEMINI_API_KEY not configured")

        start = time.perf_counter()
        try:
            client = self._get_client()
            def _check():
                return client.models.generate_content(
                    model=os.getenv("GEMINI_MODEL", "gemini-3.6-flash"),
                    contents="ping",
                )
            await asyncio.to_thread(_check)
            elapsed_ms = (time.perf_counter() - start) * 1000
            self.status = "ONLINE"
            return ProviderHealth(status="ONLINE", latency_ms=round(elapsed_ms, 2), last_checked=now_str)
        except Exception as e:
            err_str = str(e)
            if "429" in err_str or "quota" in err_str.lower() or "resource_exhausted" in err_str.lower():
                self.status = "QUOTA_EXCEEDED"
            elif "permission_denied" in err_str.lower() or "api_key" in err_str.lower():
                self.status = "DEGRADED"
            else:
                self.status = "OFFLINE"
            return ProviderHealth(status=self.status, last_checked=now_str, error_message=err_str[:120])

    async def get_models(self) -> List[ProviderModel]:
        return self.default_models

    def _build_contents_and_config(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        file_info: Optional[Dict[str, Any]] = None,
    ):
        contents = []

        file_prefix = ""
        if file_info:
            if file_info.get("type") == "text":
                file_prefix = f"### File Attachment Context:\n```\n{file_info.get('content', '')}\n```\n\n"
            elif file_info.get("type") == "image":
                image_path = file_info.get("path")
                mime_type = file_info.get("mime_type", "image/jpeg")
                if os.path.exists(image_path):
                    with open(image_path, "rb") as f:
                        contents.append(types.Part.from_bytes(data=f.read(), mime_type=mime_type))

        if history:
            for turn in history:
                role = turn.get("role")
                content = turn.get("content", "")
                gemini_role = "user" if role == "user" else "model"
                contents.append(types.Content(
                    role=gemini_role,
                    parts=[types.Part.from_text(text=content)]
                ))

        final_text = f"{file_prefix}{message}" if file_prefix else message
        contents.append(types.Part.from_text(text=final_text))

        config = types.GenerateContentConfig(
            system_instruction=system_prompt or "You are Yash.AI, an intelligent, concise, and structured AI assistant.",
            temperature=0.7,
        )
        return contents, config

    async def generate_response(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        file_info: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> str:
        client = self._get_client()
        contents, config = self._build_contents_and_config(message, history, system_prompt, file_info)
        target_model = model if model and model not in ["auto", "gemini"] else os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

        models_to_try = [target_model, "gemini-3.6-flash"]
        models_to_try = list(dict.fromkeys(models_to_try))

        last_err = None
        for m in models_to_try:
            try:
                def _call():
                    res = client.models.generate_content(
                        model=m,
                        contents=contents,
                        config=config,
                    )
                    return res.text or ""
                return await asyncio.to_thread(_call)
            except Exception as e:
                last_err = e
                err_str = str(e)
                logger.warning(f"Gemini model {m} failed: {e}")
                if "429" in err_str or "quota" in err_str.lower() or "resource_exhausted" in err_str.lower():
                    self.status = "QUOTA_EXCEEDED"
                continue
        raise last_err

    async def stream_response(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        file_info: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        client = self._get_client()
        contents, config = self._build_contents_and_config(message, history, system_prompt, file_info)
        target_model = model if model and model not in ["auto", "gemini"] else os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

        models_to_try = [target_model, "gemini-3.6-flash"]
        models_to_try = list(dict.fromkeys(models_to_try))

        queue: asyncio.Queue = asyncio.Queue()
        sentinel = object()
        loop = asyncio.get_running_loop()

        def _worker(m_name):
            try:
                stream = client.models.generate_content_stream(
                    model=m_name,
                    contents=contents,
                    config=config,
                )
                for chunk in stream:
                    try:
                        text = chunk.text
                    except Exception:
                        text = None
                    if text:
                        loop.call_soon_threadsafe(queue.put_nowait, text)
                loop.call_soon_threadsafe(queue.put_nowait, sentinel)
            except Exception as exc:
                loop.call_soon_threadsafe(queue.put_nowait, exc)

        last_error = None
        for m in models_to_try:
            while not queue.empty():
                try:
                    queue.get_nowait()
                except Exception:
                    break

            loop.run_in_executor(None, _worker, m)
            
            got_tokens = False
            while True:
                item = await queue.get()
                if item is sentinel:
                    return
                elif isinstance(item, Exception):
                    last_error = item
                    break
                else:
                    got_tokens = True
                    yield item

            if got_tokens:
                return

        if last_error:
            fallback_text = await self.generate_response(message, history, system_prompt, file_info, model)
            yield fallback_text
