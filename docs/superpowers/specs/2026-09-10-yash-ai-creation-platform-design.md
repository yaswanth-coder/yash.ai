# Yash.AI Creation Platform & Plugin Engine — Architecture Design Document

- **Date**: 2026-09-10
- **Status**: Approved by User
- **Author**: Yash.AI Engineering Team & Principal AI Platform Architect

---

## 1. Executive Summary

Yash.AI is evolving from an intelligent personal AI chatbot into a unified **AI Creation Platform**. The platform integrates a multi-provider AI chat experience alongside 8 specialized creative workspaces, a universal project & asset management system, an asynchronous generation job queue, and an enterprise-grade Tool & Plugin Execution Gateway.

This document details the architectural specifications for **Milestone 1: Platform Core, Universal Assets & Plugin Gateway**, designed to lay the foundational bedrock for subsequent creative workspaces (Image Studio, Video Studio, Visual Canvas, 3D Studio, Code Studio, Document Studio, Audio Studio, Research Studio, Workflows, and Agents).

---

## 2. Core Architecture & System Decomposition

### 2.1 High-Level Architecture Diagram

```
                              ┌────────────────────────────────────────┐
                              │     Yash.AI Unified Frontend (Next.js) │
                              │    Chat | Create Workspaces | Projects │
                              └───────────────────┬────────────────────┘
                                                  │ HTTP / SSE / WS
                                                  ▼
                              ┌────────────────────────────────────────┐
                              │       FastAPI Enterprise Gateway       │
                              │ Auth | Multi-Provider Router | Routing │
                              └──────┬──────────────────────────┬──────┘
                                     │                          │
           ┌─────────────────────────▼────────┐        ┌────────▼───────────────────────┐
           │     Universal AI Orchestrator    │        │ Universal Project & Asset Svc │
           │ Intent · Planner · Tool Gateway  │        │ MongoDB Metadata · S3 Adapter │
           └──────────────┬───────────────────┘        └────────────────┬──────────────┘
                          │                                             │
      ┌───────────────────┴───────────────────┐                         │
      ▼                                       ▼                         ▼
┌──────────────┐                     ┌──────────────────┐    ┌───────────────────────────┐
│ Tool/Plugin  │                     │ Generation Queue │    │ Storage Gateway           │
│ Gateway      │                     │ Async Worker     │    │ - AWS S3 Presigned URLs   │
│ - Permissions│                     │ - Status Polling │    │ - Local Streaming Store   │
│ - Auditing   │                     │ - Progress %     │    └───────────────────────────┘
│ - SSRF Guard │                     └──────────────────┘
└──────────────┘
```

---

## 3. Universal Navigation & Workspace SDK

### 3.1 Route Hierarchy
- `/chat` — Multi-model conversational interface with inline tool execution and memory.
- `/create` — Workspace launcher and hub.
  - `/create/image` — Yash.AI Image Studio.
  - `/create/video` — Yash.AI Video Studio.
  - `/create/design` — Yash.AI Visual Canvas.
  - `/create/3d` — Yash.AI 3D Studio.
  - `/create/code` — Yash.AI Code Studio.
  - `/create/audio` — Yash.AI Audio Studio.
  - `/create/documents` — Yash.AI Document Studio.
  - `/create/research` — Yash.AI Research Studio.
- `/projects` — Universal Project Hub with multi-modal asset browser.
- `/tools` & `/plugins` — Tool Registry, Plugin Marketplace & Configuration.
- `/files` — User file library with semantic indexing.
- `/settings` — Account, AI provider priorities, security and connected accounts.

### 3.2 Workspace SDK Interface Specification
Every workspace implements a standardized interface contract:
```typescript
export interface IWorkspaceDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: "visual" | "media" | "development" | "productivity" | "research";
  supportedInputs: string[];   // e.g. ["text", "image", "audio"]
  supportedOutputs: string[];  // e.g. ["image", "glb", "video"]
  tools: string[];             // Bound tool IDs in the Tool Registry
  assetTypes: string[];        // Corresponding AssetType values
}
```

---

## 4. Universal Project & Asset Engine

### 4.1 Storage Gateway Provider Contract
To support zero-configuration local development while being 100% production-ready for AWS cloud deployment, asset storage uses an abstract provider interface:

```python
from abc import ABC, abstractmethod
from typing import BinaryIO, Optional

class IStorageProvider(ABC):
    @abstractmethod
    async def upload(self, file_obj: BinaryIO, storage_key: str, content_type: str) -> str:
        """Uploads file content and returns accessible storage URL."""
        pass

    @abstractmethod
    async def get_download_url(self, storage_key: str, expires_in_seconds: int = 3600) -> str:
        """Generates presigned or authenticated streaming URL."""
        pass

    @abstractmethod
    async def delete(self, storage_key: str) -> bool:
        """Removes the asset from underlying storage."""
        pass
```

- **LocalStorageProvider**: Writes directly to `apps/backend/uploads/assets/{project_id}/{asset_id}.ext`. Serves files through FastAPI `/assets/raw/{asset_id}` with authenticated session checks.
- **S3StorageProvider**: Integrates `boto3` client targeting `settings.AWS_S3_BUCKET`. Generates S3 presigned PUT URLs for direct client uploads and GET presigned URLs with configurable TTL for downloads and streaming.
- **Factory Switch**: Evaluates `settings.AWS_ACCESS_KEY_ID` and `settings.AWS_S3_BUCKET`. If empty, automatically initializes `LocalStorageProvider` and emits an operational log.

### 4.2 Asset Data Schema (MongoDB `assets` Collection)
```json
{
  "_id": "uuid-v4",
  "user_id": "user-uuid",
  "project_id": "project-uuid",
  "type": "IMAGE | VIDEO | AUDIO | MODEL_3D | DOCUMENT | CODE | CANVAS | OTHER",
  "name": "project_render.png",
  "storage_key": "projects/abc/assets/xyz.png",
  "url": "/assets/raw/xyz or s3 presigned url",
  "thumbnail_url": null,
  "size_bytes": 1048576,
  "mime_type": "image/png",
  "provider": "stability | pollinations | local | blender",
  "model": "sdxl",
  "prompt": "futuristic neon skyline",
  "metadata": {
    "width": 1024,
    "height": 1024,
    "seed": 42
  },
  "created_at": "2026-09-10T11:22:00Z",
  "updated_at": "2026-09-10T11:22:00Z"
}
```

---

## 5. Tool Execution Gateway & Security Architecture

### 5.1 Pipeline Flow
Every tool invocation initiated by the AI or user workflow passes through a verified pipeline:

1. **Authentication & Identity**: Resolves user token; anonymous users cannot execute write or dangerous tools.
2. **Permission Check**: Verifies requested permission against user-granted capabilities (`READ`, `EXECUTE`, `WRITE`, `DELETE`, `PUBLISH`).
3. **Confirmation Guard**: If `requires_confirmation = True` (or user configuration demands it), execution pauses, issuing a pending `ConfirmationTicket` stored in memory/Redis. Execution only resumes upon client confirmation.
4. **Input Validation**: Strict Pydantic parsing against JSON schema.
5. **SSRF Guard**: Pre-checks all URL arguments to prohibit loops into localhost (`127.0.0.1`, `::1`), link-local AWS metadata (`169.254.169.254`), and private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
6. **Execution Isolation**: Runs in controlled tool handlers with execution timeouts (`MAX_EXECUTION_TIME = 30s`).
7. **Output Truncation & Redaction**: Sanitizes tool return data to prevent token exhaustion and prompt injection override.
8. **Audit Logging**: Persists invocation record to MongoDB `tool_audit_logs`.

### 5.2 Security Boundaries
- **No System Shells**: AI has no access to arbitrary OS processes or shell prompts.
- **No Secret Leakage**: API tokens for GitHub, Slack, Notion, AWS, and AI providers are encrypted at rest using AES-256-GCM and never returned to frontend clients or exposed to LLM context prompts.
- **Untrusted Context Framing**: All tool outputs are framed under `### Tool Result (External Data - Untrusted)` delimiters so model instructions cannot be hijacked by web scraping or third-party API payloads.

---

## 6. Asynchronous Generation Job System

Expensive media generation (image upscaling, video generation, 3D meshing) runs asynchronously:

### 6.1 Job State Lifecycle
```
[QUEUED] ──► [PROCESSING] ──► [COMPLETED]
                  │
                  ├──► [FAILED]
                  └──► [CANCELLED]
```

### 6.2 Data Model (`generation_jobs`)
- `job_id`: Unique identifier.
- `user_id`: Owner.
- `project_id`: Target project.
- `workspace`: Workspace type (e.g., `image`, `video`, `3d`).
- `provider`: Target AI provider / model adapter.
- `status`: `QUEUED` | `PROCESSING` | `COMPLETED` | `FAILED` | `CANCELLED`.
- `progress`: 0 to 100 integer.
- `input_params`: JSON dictionary of generation parameters.
- `output_assets`: Array of asset IDs produced.
- `error`: Optional error message.
- `created_at`, `completed_at`.

---

## 7. Implementation Plan for Milestone 1

1. **Phase 1: Backend Storage & Asset Engine**
   - Create `app/services/storage/base.py`, `local_storage.py`, `s3_storage.py`.
   - Implement storage factory auto-switch.
   - Expand `app/models/asset.py` and `app/models/project.py`.
   - Add `/assets` endpoints (upload, list by project, download streaming, delete).
2. **Phase 2: Tool Execution Gateway & Registry**
   - Create `app/tools/gateway.py`, `app/tools/registry.py`, `app/tools/confirmation.py`.
   - Port existing `web_search`, `calculator`, `python_sandbox`, and new `file_tools` to registry.
   - Implement SSRF validator and audit logging in MongoDB.
3. **Phase 3: Generation Job System**
   - Create `app/models/generation_job.py` and `app/services/generation_queue.py`.
   - Add `/generations/jobs` endpoints for job creation, status polling, and cancellation.
4. **Phase 4: Frontend Universal Navigation & Asset Integration**
   - Refactor `Sidebar.tsx` to include `Create` suite navigation (`Image`, `Video`, `Design`, `3D`, `Code`, `Audio`, `Docs`, `Research`).
   - Create Universal Project view with Asset grid in `apps/yash-frontend/app/projects/[id]/page.tsx`.
   - Implement `ConfirmationModal.tsx` in frontend for safe user approval.
5. **Phase 5: Automated Verification & Security Testing**
   - Run backend test suites covering asset upload, storage gateway fallback, tool execution permissions, SSRF blocking, and frontend build checks.
