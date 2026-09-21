# Yash.AI Plugin & Tool Platform Architecture

This document details the architectural design, security boundaries, and runtime execution pipelines of the Yash.AI Plugin & Tool Platform.

---

## 1. System Overview

Yash.AI provides an enterprise-ready, extensible plugin platform that enables the AI assistant to safely discover tools, inspect their capabilities, enforce security policies and human confirmations, execute API integrations, and continue multi-step reasoning over the output.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          User Interface                                │
│       Next.js Web App  │  Windows Desktop App  │  Android App          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI Backend Gateway                         │
│   ├── JWT Auth & User Session Verification                             │
│   ├── Plugin Management API (/api/plugins)                             │
│   ├── Chat & Streaming Orchestrator (/chat, /chat/stream)              │
│   └── Tool Gateway Endpoint (/tools/execute, /tools/confirm)           │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │                                │
                    ▼                                ▼
┌───────────────────────────────────┐  ┌─────────────────────────────────┐
│       AI Orchestrator Engine      │  │    Plugin & Tool Registry       │
│  - Dynamic System Prompt Ingestion│  │  - Manifest Catalog             │
│  - JSON Tool-Call Parsing         │  │  - Installed Plugins per User   │
│  - Multi-step Reasoning Loop      │  │  - Active Tool Definitions      │
│  - Anti-Prompt-Injection Demarc.  │  │  - Permission Tier Mapping      │
└───────────────────┬───────────────┘  └─────────────────┬───────────────┘
                    │                                    │
                    └─────────────────┬──────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    Tool Execution Security Gateway                     │
│  1. Authentication & Tenant Isolation                                  │
│  2. Permission Tier & Grant Check (read / write / admin)               │
│  3. Sliding-Window Rate Limiting (60 calls/min)                        │
│  4. Pydantic Input Schema Validation                                   │
│  5. SSRF Defense Filter (Blocks RFC 1918, 127.0.0.1, 169.254.169.254)  │
│  6. Human-in-the-Loop Confirmation Protocol (Signed Ticket System)     │
│  7. Just-In-Time Credential Decryption (Fernet AES-128-CBC + HMAC)     │
│  8. Sandboxed Async Execution (Strict 30s Timeout)                     │
│  9. Output Sanitization & Anti-Injection Delimitation                  │
│ 10. Immutable Audit Logging (MongoDB `plugin_audit_logs`)              │
└─────────────────────────────────────┬──────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                  First-Party & Third-Party Adapters                    │
│   Web Search  │  User Files  │  GitHub  │  Drive  │  Calendar  │ Slack  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Architectural Layers

### 2.1 Storage & Data Isolation
- **Plugin Manifests (`manifests.py`)**: Declarative metadata, schemas, required permissions, and author info.
- **Installations (`plugin_installations`)**: User-scoped document recording whether a plugin is enabled and which permissions (`read`, `write`, `admin`) the user granted.
- **Encrypted Connections (`plugin_connections`)**: Encrypted API keys or OAuth refresh tokens. Secrets are encrypted using authenticated symmetric encryption (`cryptography.fernet`) with keys derived from the server master secret.
- **Audit Logs (`plugin_audit_logs`)**: Records `user_id`, `tool_id`, duration in ms, execution status, sanitized parameters, and errors.
- **Confirmation Tickets (`plugin_confirmations`)**: In-memory and database-backed pending confirmation tickets with 10-minute TTLs.

### 2.2 Security Gateway Pipeline
Every tool call initiated by the AI or user must pass through the `ToolGateway` before invoking network sockets or third-party APIs:

1. **Authentication Check**: Verifies valid user identity. Rejects anonymous access for non-public tools.
2. **Permission Check**: Ensures the user has installed the plugin and granted the exact permission tier required (e.g. `github.write` for creating issues).
3. **Rate Limiting**: Employs a sliding-window counter (60 requests per minute per user) to protect against infinite AI tool loops.
4. **SSRF Filter**: Any URL arguments in parameters are inspected. Non-HTTP(S) schemes, private IP ranges (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), loopback (`127.0.0.1`), and AWS cloud metadata endpoints (`169.254.169.254`) are blocked with HTTP 400.
5. **Human Confirmation Check**: For write or destructive operations (e.g., creating issues, modifying calendars, sending messages, deleting files), the gateway issues a unique `ConfirmationTicket`. The execution halts and returns `CONFIRMATION_REQUIRED` to the client.
6. **Credential Decryption**: Decrypts user credentials on demand in memory and passes them to the tool handler.
7. **Timeout Guard**: Wraps execution in `asyncio.wait_for(timeout=30)`.
8. **Sanitization**: Results are demarcated with `<!-- BEGIN TOOL RESULT: <id> -->` and `<!-- END TOOL RESULT -->` to protect against prompt injection attacks originating from untrusted web data.

---

## 3. Human-in-the-Loop Confirmation Protocol

For operations that modify external systems or state:
1. Model generates tool call (e.g. `slack.send_message`).
2. Gateway identifies tool as `requires_confirmation = True`.
3. Gateway generates a cryptographically random ticket ID with summary and parameters.
4. Orchestrator pauses execution and returns `CONFIRMATION_REQUIRED` with `ticket_id` to UI.
5. UI displays `ConfirmationModal` showing exact operation, recipient, and parameters.
6. User clicks **"Approve & Execute"** or **"Cancel"**.
7. If approved, UI calls `POST /tools/confirm` to set status to `APPROVED`.
8. UI triggers chat continuation with `confirmation_ticket_id`.
9. Gateway validates approved ticket, consumes it (preventing replay attacks), executes the tool, and feeds result to AI.

---

## 4. Multi-Platform Support
- **Next.js Web / PWA**: Full interactive marketplace, credential modals, tool execution badges, confirmation dialogs.
- **Windows Desktop**: Electron / WebView2 client connecting directly to the FastAPI API endpoints.
- **Android App**: Kotlin / WebView client receiving SSE streaming events and native confirmation alerts.
