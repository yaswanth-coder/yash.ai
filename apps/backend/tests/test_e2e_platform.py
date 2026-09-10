import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_platform_health_and_version():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/")
        assert res.status_code == 200
        data = res.json()
        assert "Yash.AI" in data["message"]
        assert data["database"] == "MongoDB"


@pytest.mark.asyncio
async def test_tools_discovery():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/tools")
        assert res.status_code == 200
        tools = res.json()
        tool_ids = [t["id"] for t in tools]
        assert "web.search" in tool_ids
        assert "calculator.evaluate" in tool_ids
        assert "python.sandbox" in tool_ids
        assert "files.delete" in tool_ids
        
        # Check files.delete flags requires_confirmation
        delete_tool = next(t for t in tools if t["id"] == "files.delete")
        assert delete_tool["requires_confirmation"] is True
        assert delete_tool["permission_tier"] == "DELETE"


@pytest.mark.asyncio
async def test_tool_gateway_calculator_execution():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/tools/execute", json={
            "tool_id": "calculator.evaluate",
            "params": {"expression": "25 * 4 + 10"}
        })
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["data"]["result"] == 110


@pytest.mark.asyncio
async def test_tool_gateway_ssrf_blocking():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/tools/execute", json={
            "tool_id": "web.search",
            "params": {"query": "http://127.0.0.1:8000/admin"}
        })
        assert res.status_code == 400
        assert "SSRF" in res.json()["detail"]
