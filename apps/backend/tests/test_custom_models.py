import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.services.custom_model_service import (
    add_custom_model,
    get_custom_models,
    get_custom_model_by_id,
    delete_custom_model,
)
from app.services.providers.router import get_router


@pytest.mark.asyncio
async def test_add_and_list_custom_model():
    model_id = "test-xkiro-fast"
    added = await add_custom_model(
        model_id=model_id,
        name="xKiro Fast",
        base_url="https://api.xkiro.com/v1",
        api_key="xk-secret-1234567890",
        context_window=64000,
        description="Fast test xKiro inference",
    )
    assert added["name"] == "xKiro Fast"
    assert "..." in added["api_key"]  # Verify key masking

    # Retrieve all
    models = await get_custom_models(mask_keys=True)
    found = next((m for m in models if model_id in m["model_id"]), None)
    assert found is not None
    assert found["name"] == "xKiro Fast"
    assert found["is_custom"] is True

    # Retrieve unmasked by ID for execution
    raw = await get_custom_model_by_id(found["model_id"])
    assert raw is not None
    assert raw["api_key"] == "xk-secret-1234567890"

    # Clean up
    deleted = await delete_custom_model(found["model_id"])
    assert deleted is True


@pytest.mark.asyncio
async def test_custom_models_api_endpoints():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Add model via API
        res = await ac.post("/ai/providers/custom-models", json={
            "model_id": "my-custom-llm",
            "name": "My Custom Intelligence",
            "base_url": "https://api.openai.com/v1",
            "api_key": "sk-1234567890abcdef",
            "context_window": 128000,
            "description": "Custom LLM API test"
        })
        assert res.status_code == 200
        data = res.json()
        assert "custom:my-custom-llm" in data["model_id"]
        assert "..." in data["api_key"]

        # 2. List custom models via API
        list_res = await ac.get("/ai/providers/custom-models")
        assert list_res.status_code == 200
        items = list_res.json()
        assert any("my-custom-llm" in m["model_id"] for m in items)

        # 3. Check /ai/providers/models reflects custom models
        all_models_res = await ac.get("/ai/providers/models")
        assert all_models_res.status_code == 200
        all_models = all_models_res.json()
        assert any("my-custom-llm" in m["id"] for m in all_models)

        # 4. Delete model via API
        del_res = await ac.delete(f"/ai/providers/custom-models/{data['model_id']}")
        assert del_res.status_code == 200
        assert del_res.json()["success"] is True
