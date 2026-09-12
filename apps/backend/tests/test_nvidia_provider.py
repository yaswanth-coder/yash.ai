import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.providers.nvidia_provider import NvidiaProvider
from app.services.providers.router import get_router


@pytest.mark.asyncio
async def test_nvidia_provider_init():
    provider = NvidiaProvider()
    assert provider.name == "nvidia"
    assert provider.is_local is False
    assert provider.api_url == "https://integrate.api.nvidia.com/v1/chat/completions"
    
    models = await provider.get_models()
    assert len(models) >= 4
    model_ids = [m.id for m in models]
    assert "nvidia:meta/llama-3.3-70b-instruct" in model_ids
    assert "nvidia:deepseek-ai/deepseek-r1" in model_ids
    assert "nvidia:nvidia/llama-3.1-nemotron-70b-instruct" in model_ids


@pytest.mark.asyncio
async def test_nvidia_provider_health_when_unconfigured(monkeypatch):
    provider = NvidiaProvider()
    monkeypatch.setenv("NVIDIA_API_KEY", "")
    
    # When no key is configured
    assert provider.is_configured() is False
    health = await provider.health_check()
    assert health.status == "DISABLED"


@pytest.mark.asyncio
async def test_nvidia_provider_message_formatting():
    provider = NvidiaProvider()
    formatted = provider._format_messages(
        message="Hello world",
        history=[{"role": "user", "content": "Hi"}, {"role": "assistant", "content": "Hey"}],
        system_prompt="You are a helpful assistant.",
        file_info={"type": "text", "content": "Sample file data"}
    )
    assert len(formatted) == 4
    assert formatted[0] == {"role": "system", "content": "You are a helpful assistant."}
    assert formatted[1] == {"role": "user", "content": "Hi"}
    assert formatted[2] == {"role": "assistant", "content": "Hey"}
    assert "File Context:" in formatted[3]["content"]
    assert "Hello world" in formatted[3]["content"]


@pytest.mark.asyncio
async def test_router_includes_nvidia():
    router = get_router()
    assert "nvidia" in router.providers
    assert isinstance(router.providers["nvidia"], NvidiaProvider)
    
    all_models = await router.get_all_models()
    nvidia_models = [m for m in all_models if m.id.startswith("nvidia:")]
    assert len(nvidia_models) >= 4


@pytest.mark.asyncio
async def test_api_providers_endpoint_includes_nvidia():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/ai/providers")
        assert res.status_code == 200
        data = res.json()
        assert "nvidia" in data["providers"]
        assert data["providers"]["nvidia"]["name"] == "nvidia"
        assert data["providers"]["nvidia"]["is_local"] is False

        # Check /ai/providers/models endpoint
        res_models = await ac.get("/ai/providers/models")
        assert res_models.status_code == 200
        models_data = res_models.json()
        nvidia_models = [m for m in models_data if m["id"].startswith("nvidia:")]
        assert len(nvidia_models) >= 4
