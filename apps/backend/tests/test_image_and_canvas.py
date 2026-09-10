import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.deps import get_current_user
from app.core.database import get_db
from app.services.image_generation import get_image_generation_service
from app.tools.registry import get_tool_registry
from app.tools.gateway import ToolGateway


@pytest.fixture(autouse=True)
def override_user():
    fake_user = {"_id": "test_creative_user", "email": "creator@yash.ai", "full_name": "Creative User"}
    app.dependency_overrides[get_current_user] = lambda: fake_user
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_3d_tools_registered():
    registry = get_tool_registry()
    scene_tool = registry.get("3d.generate_scene")
    material_tool = registry.get("3d.apply_material")

    assert scene_tool is not None
    assert scene_tool.category == "3d"
    assert material_tool is not None
    assert material_tool.category == "3d"

    # Test execution of 3D scene generator
    gateway = ToolGateway()
    res = await gateway.execute_tool(
        tool_id="3d.generate_scene",
        params={"prompt": "Futuristic flying speeder with glowing thrusters"},
        user_id="test_user"
    )
    assert res["success"] is True
    assert "objects" in res["data"]
    assert len(res["data"]["objects"]) > 0
    assert res["data"]["objects"][0]["type"] in ("Cube", "Sphere", "Cylinder", "Torus")


@pytest.mark.asyncio
async def test_image_generation_service_fallback():
    service = get_image_generation_service()
    
    # Mock database and storage
    with patch("app.services.image_generation.get_database") as mock_db, \
         patch.object(service.storage, "upload", new_callable=AsyncMock) as mock_upload:
        
        mock_upload.return_value = {
            "storage_key": "projects/p123/assets/mock.png",
            "download_url": "/assets/raw/mock.png"
        }
        mock_db.return_value["assets"].insert_one = AsyncMock()

        result = await service.generate_and_save_image(
            user_id="user_123",
            project_id="p123",
            prompt="A majestic cyberpunk tower at dusk",
            aspect_ratio="16:9",
            style="Cinematic"
        )

        assert "asset_id" in result
        assert result["url"] == "/assets/raw/mock.png"
        assert result["width"] == 1280
        assert result["height"] == 720
        assert mock_upload.called
        assert mock_db.return_value["assets"].insert_one.called


@pytest.mark.asyncio
async def test_canvas_lifecycle_api():
    mock_db = MagicMock()
    mock_db["assets"].insert_one = AsyncMock()
    app.dependency_overrides[get_db] = lambda: mock_db

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            save_payload = {
                "project_id": "proj_abc",
                "title": "Storyboard Canvas",
                "nodes": [
                    {"id": "node_1", "type": "image", "x": 100, "y": 200, "content": "img_url"},
                    {"id": "node_2", "type": "note", "x": 300, "y": 200, "content": "Concept Idea"}
                ],
                "connections": [{"from": "node_1", "to": "node_2"}],
                "viewport": {"x": 50, "y": 50, "zoom": 1.2}
            }

            resp = await ac.post("/canvas/save", json=save_payload)
            assert resp.status_code == 200
            data = resp.json()
            assert "canvas_id" in data
            assert data["node_count"] == 2
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.asyncio
async def test_enhance_prompt_api():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        resp = await ac.post(
            "/generations/enhance-prompt",
            json={"prompt": "red sports car", "style": "Photorealistic"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["original_prompt"] == "red sports car"
        assert len(data["enhanced_prompt"]) > len(data["original_prompt"])
