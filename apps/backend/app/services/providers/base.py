from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, AsyncGenerator
from pydantic import BaseModel


class ProviderModel(BaseModel):
    id: str
    name: str
    context_window: int = 8192
    description: Optional[str] = None
    is_local: bool = False


class ProviderHealth(BaseModel):
    status: str  # "ONLINE", "DEGRADED", "RATE_LIMITED", "QUOTA_EXCEEDED", "OFFLINE", "DISABLED"
    latency_ms: Optional[float] = None
    last_checked: str
    error_message: Optional[str] = None


class AIProvider(ABC):
    """
    Common interface for all AI Providers (Gemini, Ollama, Groq, Claude, OpenAI).
    """

    def __init__(self, name: str, is_local: bool = False):
        self.name = name
        self.is_local = is_local
        self.failure_count = 0
        self.cooldown_until: Optional[float] = None
        self.status = "ONLINE"

    @abstractmethod
    def is_configured(self) -> bool:
        """Return True if required API keys / URLs are set in environment."""
        pass

    @abstractmethod
    async def health_check(self) -> ProviderHealth:
        """Test provider connectivity and return health status."""
        pass

    @abstractmethod
    async def get_models(self) -> List[ProviderModel]:
        """Return list of supported or installed models for this provider."""
        pass

    @abstractmethod
    async def generate_response(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        file_info: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> str:
        """Generate a complete text response."""
        pass

    @abstractmethod
    async def stream_response(
        self,
        message: str,
        history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None,
        file_info: Optional[Dict[str, Any]] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> AsyncGenerator[str, None]:
        """Yield tokens as they are generated in real-time."""
        pass
