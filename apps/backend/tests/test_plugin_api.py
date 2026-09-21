import pytest
from unittest.mock import AsyncMock, MagicMock
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.deps import get_current_user, get_optional_user
from app.core.database import get_database, get_db


class MockCursor:
    def __init__(self, docs):
        self.docs = docs

    def sort(self, *args, **kwargs):
        return self

    def limit(self, *args, **kwargs):
        return self

    async def to_list(self, length):
        return self.docs

    def __aiter__(self):
        self._iter = iter(self.docs)
        return self

    async def __anext__(self):
        try:
            return next(self._iter)
        except StopIteration:
            raise StopAsyncIteration


class MockCollection:
    def __init__(self):
        self.data = {}

    async def find_one(self, query):
        uid = query.get("user_id")
        pid = query.get("plugin_id")
        if pid:
            return self.data.get((uid, pid))
        return None

    def find(self, query):
        uid = query.get("user_id")
        matches = [v for k, v in self.data.items() if k[0] == uid]
        return MockCursor(matches)

    async def update_one(self, query, update, upsert=False):
        uid = query.get("user_id")
        pid = query.get("plugin_id")
        set_vals = update.get("$set", {})
        doc = self.data.get((uid, pid), {})
        doc.update(set_vals)
        self.data[(uid, pid)] = doc
        res = MagicMock()
        res.matched_count = 1
        return res

    async def delete_one(self, query):
        uid = query.get("user_id")
        pid = query.get("plugin_id")
        self.data.pop((uid, pid), None)
        return MagicMock()

    async def insert_one(self, doc):
        return MagicMock()


class MockDB:
    def __init__(self):
        self.collections = {
            "plugin_installations": MockCollection(),
            "plugin_connections": MockCollection(),
            "tool_audit_logs": MockCollection(),
        }

    def __getitem__(self, name):
        if name not in self.collections:
            self.collections[name] = MockCollection()
        return self.collections[name]


@pytest.mark.asyncio
async def test_plugins_api_endpoints():
    mock_user = {"_id": "test_user_pwa_123", "email": "test@yash.ai", "name": "Test User"}
    mock_db = MockDB()

    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_optional_user] = lambda: mock_user
    app.dependency_overrides[get_db] = lambda: mock_db

    import app.core.database as db_module
    import app.plugins.service as service_module
    import app.api.plugins as api_plugins_module
    orig_get_db = db_module.get_database
    db_module.get_database = lambda: mock_db
    service_module.get_database = lambda: mock_db
    api_plugins_module.get_database = lambda: mock_db

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. List available plugins
            resp = await client.get("/plugins")
            assert resp.status_code == 200
            plugins = resp.json()
            assert isinstance(plugins, list)
            plugin_ids = [p["id"] for p in plugins]
            assert "github" in plugin_ids
            assert "web_search" in plugin_ids
            assert "google_drive" in plugin_ids
            assert "google_calendar" in plugin_ids
            assert "slack" in plugin_ids
            assert "notion" in plugin_ids

            # 2. Get details of GitHub plugin
            resp_gh = await client.get("/plugins/github")
            assert resp_gh.status_code == 200
            gh_data = resp_gh.json()
            assert gh_data["name"] == "GitHub"
            assert len(gh_data["tools"]) >= 4

            # 3. Get tools of GitHub plugin
            resp_tools = await client.get("/plugins/github/tools")
            assert resp_tools.status_code == 200
            tools = resp_tools.json()
            assert any(t["id"] == "github.search_repositories" for t in tools)

            # 4. Install GitHub plugin
            resp_install = await client.post("/plugins/github/install", json={"granted_permissions": ["github.read"]})
            assert resp_install.status_code == 200
            assert resp_install.json()["success"] is True

            # 5. Configure GitHub plugin with secret token (encrypted)
            resp_conf = await client.post("/plugins/github/configure", json={"credentials": {"token": "ghp_mock_token_123"}})
            assert resp_conf.status_code == 200
            assert resp_conf.json()["success"] is True

            # 6. Disable plugin
            resp_dis = await client.post("/plugins/github/disable")
            assert resp_dis.status_code == 200
            assert resp_dis.json()["enabled"] is False

            # 7. Enable plugin
            resp_en = await client.post("/plugins/github/enable")
            assert resp_en.status_code == 200
            assert resp_en.json()["enabled"] is True

            # 8. Check audit logs endpoint
            resp_audit = await client.get("/plugins/audit/logs")
            assert resp_audit.status_code == 200
            assert isinstance(resp_audit.json(), list)

            # 9. Uninstall plugin
            resp_del = await client.delete("/plugins/github")
            assert resp_del.status_code == 200
            assert resp_del.json()["success"] is True

    finally:
        app.dependency_overrides.clear()
        db_module.get_database = orig_get_db
        service_module.get_database = orig_get_db
