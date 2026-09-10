import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_assets_endpoints_require_auth():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/assets/project/fake-id")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_assets_single_item_requires_auth():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/assets/some-asset-id")
        assert res.status_code == 401
