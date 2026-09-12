import os
import time
import logging
from typing import List, Dict, Any, Optional, Tuple, AsyncGenerator
from app.services.providers.base import AIProvider, ProviderModel, ProviderHealth
from app.services.providers.gemini_provider import GeminiProvider
from app.services.providers.ollama_provider import OllamaProvider
from app.services.providers.groq_provider import GroqProvider
from app.services.providers.nvidia_provider import NvidiaProvider
from app.services.providers.claude_provider import ClaudeProvider
from app.services.providers.openai_provider import OpenAIProvider
from app.services.providers.custom_provider import CustomProvider

logger = logging.getLogger("yash.ai.router")


class ProviderRouter:
    def __init__(self):
        self.providers: Dict[str, AIProvider] = {
            "gemini": GeminiProvider(),
            "ollama": OllamaProvider(),
            "groq": GroqProvider(),
            "nvidia": NvidiaProvider(),
            "anthropic": ClaudeProvider(),
            "openai": OpenAIProvider(),
            "custom": CustomProvider(),
        }

    def _get_priority_list(self) -> List[str]:
        raw = os.getenv("AI_PROVIDER_PRIORITY", "gemini,ollama,groq,nvidia,anthropic,openai")
        return [p.strip().lower() for p in raw.split(",") if p.strip().lower() in self.providers]

    async def get_all_models(self) -> List[ProviderModel]:
        all_models = []
        for p in self.providers.values():
            try:
                models = await p.get_models()
                all_models.extend(models)
            except Exception:
                continue
        return all_models

    async def get_all_health(self) -> Dict[str, ProviderHealth]:
        health_map = {}
        for name, p in self.providers.items():
            try:
                health_map[name] = await p.health_check()
            except Exception as e:
                health_map[name] = ProviderHealth(
                    status="OFFLINE",
                    last_checked=time.strftime("%Y-%m-%dT%H:%M:%SZ"),
                    error_message=str(e)[:100]
                )
        return health_map

    def _resolve_target_provider(
        self,
        requested_model_or_provider: Optional[str],
        local_only: bool = False
    ) -> List[Tuple[str, AIProvider, Optional[str]]]:
        if local_only:
            ollama = self.providers.get("ollama")
            return [("ollama", ollama, requested_model_or_provider)]

        req = (requested_model_or_provider or "auto").strip()

        # Custom & xKiro dynamic models
        if req.startswith("custom:") or req.startswith("xkiro:"):
            custom_p = self.providers.get("custom")
            if custom_p:
                priority = ["custom"] + [p for p in self._get_priority_list() if p != "custom"]
                return [(p, self.providers[p], req if p == "custom" else None) for p in priority]

        # Explicit provider:model prefix e.g. "ollama:llama3.2", "groq:llama-3.3-70b-versatile"
        for p_name, p_inst in self.providers.items():
            if req.startswith(f"{p_name}:"):
                model_name = req[len(p_name) + 1:]
                priority = [p_name] + [p for p in self._get_priority_list() if p != p_name]
                return [(p, self.providers[p], model_name if p == p_name else None) for p in priority]

        # Explicit provider name only
        if req.lower() in self.providers:
            target_p = req.lower()
            priority = [target_p] + [p for p in self._get_priority_list() if p != target_p]
            return [(p, self.providers[p], None) for p in priority]

        # AUTO or unrecognized model ID — fall through to priority list
        # (unrecognized model IDs like "claude-sonnet-4-6" are treated as AUTO)
        priority = self._get_priority_list()
        return [(p, self.providers[p], None) for p in priority]

    async def generate_response(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        file_info: Optional[Dict[str, Any]] = None,
        requested_model: Optional[str] = None,
        local_only: bool = False,
    ) -> Dict[str, Any]:
        candidates = self._resolve_target_provider(requested_model, local_only)
        last_error = None
        original_provider = candidates[0][0]

        for p_name, provider, specific_model in candidates:
            if not provider.is_local and not provider.is_configured():
                continue
            if provider.cooldown_until and time.time() < provider.cooldown_until:
                continue

            try:
                reply = await provider.generate_response(
                    message=message,
                    history=history,
                    system_prompt=system_prompt,
                    file_info=file_info,
                    model=specific_model,
                )
                if reply:
                    fallback_used = p_name != original_provider
                    return {
                        "response": reply,
                        "provider": p_name,
                        "model": specific_model or "default",
                        "fallback_used": fallback_used,
                        "original_provider": original_provider if fallback_used else None,
                    }
            except Exception as ex:
                last_error = ex
                err_str = str(ex).lower()
                logger.warning(f"Provider '{p_name}' failed: {ex}")
                if "429" in err_str or "quota" in err_str or "rate" in err_str:
                    provider.cooldown_until = time.time() + 60
                continue

        if local_only:
            return {
                "response": "⚠️ Local Privacy Mode is enabled, but local Ollama is offline. Please start Ollama (`ollama serve`) or disable Local-Only mode in Settings.",
                "provider": "ollama",
                "model": "offline",
                "fallback_used": False,
            }

        raise RuntimeError(f"All configured AI providers failed. Last error: {last_error}")

    async def stream_response(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        file_info: Optional[Dict[str, Any]] = None,
        requested_model: Optional[str] = None,
        local_only: bool = False,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        candidates = self._resolve_target_provider(requested_model, local_only)
        last_error = None
        original_provider = candidates[0][0]

        for p_name, provider, specific_model in candidates:
            if not provider.is_local and not provider.is_configured():
                continue
            if provider.cooldown_until and time.time() < provider.cooldown_until:
                continue

            try:
                fallback_used = p_name != original_provider
                stream_gen = provider.stream_response(
                    message=message,
                    history=history,
                    system_prompt=system_prompt,
                    file_info=file_info,
                    model=specific_model,
                )
                yielded_meta = False
                async for token in stream_gen:
                    if token:
                        if not yielded_meta:
                            yield {
                                "type": "meta",
                                "provider": p_name,
                                "model": specific_model or "default",
                                "fallback_used": fallback_used,
                                "original_provider": original_provider if fallback_used else None,
                            }
                            yielded_meta = True
                        yield {"type": "token", "token": token}
                if yielded_meta:
                    return

            except Exception as ex:
                last_error = ex
                err_str = str(ex).lower()
                logger.warning(f"Streaming provider '{p_name}' failed: {ex}")
                # Apply cooldown for rate limits and capacity errors
                if any(k in err_str for k in ("429", "rate", "quota")):
                    provider.cooldown_until = time.time() + 60
                elif any(k in err_str for k in ("503", "529", "overload", "capacity", "unavailable")):
                    provider.cooldown_until = time.time() + 30
                continue

        yield {
            "type": "token",
            "token": f"I apologize, but all AI providers encountered an error: {str(last_error)}",
        }


# Global singleton router
router_instance = ProviderRouter()


def get_router() -> ProviderRouter:
    return router_instance
