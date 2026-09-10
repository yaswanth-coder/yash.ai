import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app


@pytest.mark.asyncio
async def test_generation_jobs_require_auth():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/generations/jobs/fake-id")
        assert res.status_code == 401


@pytest.mark.asyncio
async def test_generation_submission_requires_auth():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post("/generations/jobs", json={
            "project_id": "test-project",
            "workspace": "image",
            "provider": "pollinations",
            "model": "flux",
            "input_params": {"prompt": "neon sunset"}
        })
        assert res.status_code == 401
