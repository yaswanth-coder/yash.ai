# Milestone 1: Platform Core, Universal Assets & Plugin Gateway Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Yash.AI into a unified creation platform by deploying the Universal Project & Asset Engine with Dual Storage (Local + AWS S3), Tool Execution Gateway with granular permissions and Human Confirmation Protocol, Generation Job Queue, and the Create Workspace Navigation Shell.

**Architecture:** A unified FastAPI backend with an abstract `IStorageProvider` (Local disk for dev, AWS S3 presigned URLs for prod) feeding a MongoDB `assets` collection. An enterprise Tool Execution Gateway guards all tool calls with Pydantic schemas, SSRF sanitization, rate limiting, and interactive user confirmation tokens for destructive actions. The Next.js 16 frontend integrates the expandable `Create` suite navigation and interactive confirmation modals.

**Tech Stack:** FastAPI, Python 3.10+, Motor (MongoDB async), boto3 (optional S3), Pydantic v2, Next.js 16, React 19, TypeScript, Tailwind CSS v4, Lucide Icons.

---

## Global Constraints
- Preserve existing working auth, chat, model router (Gemini, Ollama, Groq, Claude, OpenAI), memory, and personas.
- Never hardcode credentials; all sensitive provider configs use `.env` and runtime secret isolation.
- Tool outputs must be tagged as untrusted to defend against prompt injection.
- No arbitrary shell commands or unsandboxed code execution.
- Strict user ownership on all MongoDB queries.

---

### Task 1: Dual Storage Provider Adapter & Storage Gateway

**Files:**
- Create: `apps/backend/app/services/storage/__init__.py`
- Create: `apps/backend/app/services/storage/base.py`
- Create: `apps/backend/app/services/storage/local_storage.py`
- Create: `apps/backend/app/services/storage/s3_storage.py`
- Create: `apps/backend/app/services/storage/factory.py`
- Create: `apps/backend/tests/test_storage.py`

**Interfaces:**
- Consumes: `app.core.config.settings`
- Produces: `get_storage_provider() -> IStorageProvider` with methods `upload`, `get_download_url`, `delete`

- [ ] **Step 1: Write failing storage test**
```python
# apps/backend/tests/test_storage.py
import pytest
import io
import asyncio
from app.services.storage.factory import get_storage_provider
from app.services.storage.local_storage import LocalStorageProvider

@pytest.mark.asyncio
async def test_local_storage_upload_and_retrieve():
    provider = LocalStorageProvider(base_dir="uploads/test_assets")
    dummy_file = io.BytesIO(b"test image content binary payload")
    key = "projects/test-proj/assets/test_img.png"
    url = await provider.upload(dummy_file, key, "image/png")
    assert "/assets/raw/" in url or "test_img.png" in url
    
    download_url = await provider.get_download_url(key)
    assert download_url is not None
    
    deleted = await provider.delete(key)
    assert deleted is True
```

- [ ] **Step 2: Run test to verify failure**
Run: `python -m pytest apps/backend/tests/test_storage.py -v`
Expected: FAIL with `ModuleNotFoundError` or `ImportError`

- [ ] **Step 3: Implement Storage Providers and Factory**
Implement `base.py`, `local_storage.py`, `s3_storage.py`, and `factory.py`:
- `IStorageProvider` abstract base class defining `upload(file_obj, storage_key, content_type) -> str`, `get_download_url(storage_key, expires_in_seconds) -> str`, `delete(storage_key) -> bool`.
- `LocalStorageProvider` writes to disk under `uploads/assets/...` and returns streaming path.
- `S3StorageProvider` generates S3 presigned upload/download URLs using `boto3`.
- `get_storage_provider()` auto-detects AWS env vars.

- [ ] **Step 4: Run test to verify it passes**
Run: `python -m pytest apps/backend/tests/test_storage.py -v`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/backend/app/services/storage apps/backend/tests/test_storage.py
git commit -m "feat(backend): add dual storage provider adapter with local and s3 support"
```

---

### Task 2: Universal Asset & Project System Models & API

**Files:**
- Create: `apps/backend/app/models/asset.py`
- Modify: `apps/backend/app/models/project.py`
- Create: `apps/backend/app/schemas/asset.py`
- Create: `apps/backend/app/api/assets.py`
- Modify: `apps/backend/app/api/projects.py`
- Modify: `apps/backend/app/main.py`
- Create: `apps/backend/tests/test_assets_api.py`

**Interfaces:**
- Consumes: `IStorageProvider`, `get_current_user`, `get_db`
- Produces: Endpoints `POST /assets/upload`, `GET /assets/project/{project_id}`, `GET /assets/{asset_id}`, `GET /assets/raw/{asset_id}`, `DELETE /assets/{asset_id}`

- [ ] **Step 1: Write test for Assets API**
```python
# apps/backend/tests/test_assets_api.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_assets_endpoints_require_auth():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        res = await ac.get("/assets/project/fake-id")
        assert res.status_code == 401
```

- [ ] **Step 2: Run test to verify failure**
Run: `python -m pytest apps/backend/tests/test_assets_api.py -v`
Expected: FAIL with 404 (Route not found)

- [ ] **Step 3: Implement Asset Models, Schemas, and Router**
- `app/models/asset.py`: `new_asset(user_id, project_id, asset_type, name, storage_key, mime_type, size_bytes, metadata)`
- `app/schemas/asset.py`: `AssetResponse`, `AssetUpdateRequest`
- `app/api/assets.py`: Upload file multipart endpoint, list by project endpoint, download/stream endpoint, delete endpoint with storage cleanup.
- Register `assets_router` in `apps/backend/app/main.py`.

- [ ] **Step 4: Run test to verify it passes**
Run: `python -m pytest apps/backend/tests/test_assets_api.py -v`
Expected: PASS (returns 401 Unauthorized for unauthenticated requests)

- [ ] **Step 5: Commit**
```bash
git add apps/backend/app/models/asset.py apps/backend/app/schemas/asset.py apps/backend/app/api/assets.py apps/backend/app/main.py apps/backend/tests/test_assets_api.py
git commit -m "feat(backend): implement universal asset system and api endpoints"
```

---

### Task 3: Tool Execution Gateway, Permission System & Human Confirmation Protocol

**Files:**
- Create: `apps/backend/app/tools/contracts.py`
- Create: `apps/backend/app/tools/confirmation.py`
- Create: `apps/backend/app/tools/registry.py`
- Create: `apps/backend/app/tools/gateway.py`
- Create: `apps/backend/app/tools/file_tools.py`
- Modify: `apps/backend/app/agents/orchestrator.py`
- Create: `apps/backend/app/api/tools_gateway.py`
- Modify: `apps/backend/app/main.py`
- Create: `apps/backend/tests/test_tool_gateway.py`

**Interfaces:**
- Consumes: Tool contracts, Pydantic schemas, current user
- Produces: `ToolRegistry`, `ToolGateway.execute_tool(tool_id, args, user, confirmation_ticket_id)`, Endpoints: `GET /tools`, `POST /tools/execute`, `POST /tools/confirm`

- [ ] **Step 1: Write test for SSRF defense and Confirmation Guard**
```python
# apps/backend/tests/test_tool_gateway.py
import pytest
from app.tools.gateway import ToolGateway
from app.tools.confirmation import ConfirmationManager

@pytest.mark.asyncio
async def test_ssrf_blocks_private_addresses():
    gateway = ToolGateway()
    is_safe = gateway.is_url_safe("http://127.0.0.1:8000/secret")
    assert is_safe is False
    assert gateway.is_url_safe("http://169.254.169.254/latest/meta-data") is False
    assert gateway.is_url_safe("https://en.wikipedia.org") is True

@pytest.mark.asyncio
async def test_confirmation_ticket_lifecycle():
    cm = ConfirmationManager()
    ticket = cm.create_ticket(user_id="user1", tool_id="files.delete", action_summary="Delete resume.pdf", params={"file_id": "123"})
    assert ticket.ticket_id is not None
    assert cm.verify_ticket(ticket.ticket_id, "user1") is True
    cm.consume_ticket(ticket.ticket_id)
    assert cm.verify_ticket(ticket.ticket_id, "user1") is False
```

- [ ] **Step 2: Run test to verify failure**
Run: `python -m pytest apps/backend/tests/test_tool_gateway.py -v`
Expected: FAIL with `ModuleNotFoundError`

- [ ] **Step 3: Implement Tool Contracts, Confirmation Manager, Registry, and Gateway**
- `contracts.py`: `ToolDefinition`, `PermissionTier` (`READ`, `WRITE`, `DELETE`, `EXECUTE`, `PUBLISH`).
- `confirmation.py`: In-memory thread-safe `ConfirmationManager` with ticket generation and verification.
- `registry.py`: Central registry for `web.search`, `calculator.evaluate`, `python.sandbox`, `files.list`, `files.read`, `files.delete`.
- `gateway.py`: Validation, rate limiting, SSRF checking, confirmation checks, execution, and MongoDB audit logging.
- `tools_gateway.py`: REST routes for tool discovery, execution, and user confirmation approvals.

- [ ] **Step 4: Run test to verify it passes**
Run: `python -m pytest apps/backend/tests/test_tool_gateway.py -v`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/backend/app/tools apps/backend/app/api/tools_gateway.py apps/backend/tests/test_tool_gateway.py apps/backend/app/main.py
git commit -m "feat(backend): implement tool execution gateway with confirmation protocol and ssrf guard"
```

---

### Task 4: Generation Job Queue Model & API

**Files:**
- Create: `apps/backend/app/models/generation_job.py`
- Create: `apps/backend/app/schemas/generation_job.py`
- Create: `apps/backend/app/services/generation_queue.py`
- Create: `apps/backend/app/api/generations.py`
- Modify: `apps/backend/app/main.py`
- Create: `apps/backend/tests/test_generations_api.py`

**Interfaces:**
- Consumes: `AsyncIOMotorDatabase`, `get_current_user`
- Produces: `GenerationQueueService`, Endpoints `POST /generations/jobs`, `GET /generations/jobs/{job_id}`, `POST /generations/jobs/{job_id}/cancel`, `GET /generations/jobs/project/{project_id}`

- [ ] **Step 1: Write test for Generation Job Queue API**
```python
# apps/backend/tests/test_generations_api.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_generation_jobs_require_auth():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        res = await ac.get("/generations/jobs/fake-id")
        assert res.status_code == 401
```

- [ ] **Step 2: Run test to verify failure**
Run: `python -m pytest apps/backend/tests/test_generations_api.py -v`
Expected: FAIL with 404

- [ ] **Step 3: Implement Generation Job System**
- `models/generation_job.py`: `new_generation_job(user_id, project_id, workspace, provider, model, input_params)`
- `services/generation_queue.py`: Async queue dispatcher with simulated/real background processing steps (`QUEUED` -> `PROCESSING` -> `COMPLETED`/`FAILED`).
- `api/generations.py`: Job submission, status polling, and cancellation.

- [ ] **Step 4: Run test to verify it passes**
Run: `python -m pytest apps/backend/tests/test_generations_api.py -v`
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add apps/backend/app/models/generation_job.py apps/backend/app/schemas/generation_job.py apps/backend/app/services/generation_queue.py apps/backend/app/api/generations.py apps/backend/app/main.py apps/backend/tests/test_generations_api.py
git commit -m "feat(backend): implement generation job queue and status polling endpoints"
```

---

### Task 5: Frontend Universal Navigation & Create Suite Workspace Shell

**Files:**
- Modify: `apps/yash-frontend/components/Sidebar.tsx`
- Create: `apps/yash-frontend/app/create/page.tsx`
- Create: `apps/yash-frontend/app/create/image/page.tsx`
- Create: `apps/yash-frontend/app/create/video/page.tsx`
- Create: `apps/yash-frontend/app/create/design/page.tsx`
- Create: `apps/yash-frontend/app/create/3d/page.tsx`
- Create: `apps/yash-frontend/app/create/code/page.tsx`
- Create: `apps/yash-frontend/app/create/audio/page.tsx`
- Create: `apps/yash-frontend/app/create/documents/page.tsx`
- Create: `apps/yash-frontend/app/create/research/page.tsx`
- Create: `apps/yash-frontend/components/ConfirmationModal.tsx`
- Create: `apps/yash-frontend/services/assets.ts`
- Modify: `apps/yash-frontend/app/projects/page.tsx`
- Create: `apps/yash-frontend/app/projects/[id]/page.tsx`

**Interfaces:**
- Consumes: Backend `/assets`, `/projects`, `/generations`, `/tools`
- Produces: Unified sidebar navigation with `Create` sub-routes, Project Asset Browser, Interactive Confirmation Modal

- [ ] **Step 1: Write ConfirmationModal and Asset Service**
- Implement `services/assets.ts` with typed fetchers (`fetchProjectAssets`, `uploadAsset`, `deleteAsset`).
- Implement `components/ConfirmationModal.tsx` displaying action summary, destructive warning badge, parameters, and Approve/Cancel actions.

- [ ] **Step 2: Update Sidebar with Create Suite Hub**
- Add expandable `Create` menu item with sub-links for `Image`, `Video`, `Design`, `3D`, `Code`, `Audio`, `Documents`, and `Research`.
- Add active route highlighting and mobile touch drawer support.

- [ ] **Step 3: Create Workspace Shell Pages**
- Build `/create/page.tsx` hub featuring studio cards with descriptions, capabilities, and launcher buttons.
- Build studio shell pages (`/create/image`, `/create/video`, etc.) with consistent studio headers, project context selectors, and provider status indicators.

- [ ] **Step 4: Update Project Detail View with Multi-Modal Asset Gallery**
- Build `apps/yash-frontend/app/projects/[id]/page.tsx` with tabs: `Overview`, `Assets` (Images, Videos, Audio, 3D Models, Docs, Code), and `Activity/Jobs`.

- [ ] **Step 5: Run Frontend Build & Lint Check**
Run: `npm --prefix apps/yash-frontend run build`
Expected: Build passes with zero errors

- [ ] **Step 6: Commit**
```bash
git add apps/yash-frontend/components apps/yash-frontend/app/create apps/yash-frontend/app/projects apps/yash-frontend/services
git commit -m "feat(frontend): implement universal navigation, create suite shell, and asset gallery"
```

---

### Task 6: End-to-End Integration, Security Verification & Build Check

**Files:**
- Create: `apps/backend/tests/test_e2e_platform.py`

- [ ] **Step 1: Write and Run End-to-End Verification Test**
```python
# apps/backend/tests/test_e2e_platform.py
import pytest
from httpx import AsyncClient
from app.main import app

@pytest.mark.asyncio
async def test_health_and_gateway_endpoints():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        home_res = await ac.get("/")
        assert home_res.status_code == 200
        assert "Yash.AI" in home_res.json()["message"]
        
        tools_res = await ac.get("/tools")
        assert tools_res.status_code == 200
        assert len(tools_res.json()) > 0
```

- [ ] **Step 2: Run all backend tests**
Run: `python -m pytest apps/backend/tests -v`
Expected: All tests pass

- [ ] **Step 3: Verify TypeScript Build**
Run: `npm --prefix apps/yash-frontend run build`
Expected: Success

- [ ] **Step 4: Commit and Tag Milestone 1**
```bash
git add apps/backend/tests/test_e2e_platform.py
git commit -m "test: verify milestone 1 platform core, assets, and tool gateway"
```
