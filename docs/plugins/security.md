# Yash.AI Plugin Security & Governance Architecture

This document describes the security policies, cryptographic controls, threat models, and defenses implemented within the Yash.AI Plugin & Tool Platform.

---

## 1. Threat Model & Mitigations

| Threat | Attack Vector | Yash.AI Mitigation |
| :--- | :--- | :--- |
| **Credential Exfiltration** | Database compromise or prompt leak | Stored credentials are encrypted at rest with Fernet. Passwords/keys are never returned in API responses and never injected into the LLM system prompt. |
| **Server-Side Request Forgery (SSRF)** | Malicious URL parameter targeting cloud metadata or internal microservices | `SSRFDefender` validates all URLs, resolving DNS and blocking loopback (`127.0.0.1`), private networks (`RFC 1918`), and cloud metadata (`169.254.169.254`). |
| **Indirect Prompt Injection** | Web search or file contents injecting hidden instructions to hijack LLM behavior | Tool outputs are bounded by strict demarcations (`<!-- BEGIN TOOL RESULT -->`) and sanitized to prevent context confusion. |
| **Unauthorized Action Execution** | AI agent attempting to mutate data without user knowledge | Write/destructive tools require explicit Human-in-the-Loop Confirmation via signed time-limited tickets. |
| **Denial of Service / Loop Exhaustion** | Agent stuck in infinite recursive tool-calling loop | Enforced recursion depth limit (`MAX_TOOL_DEPTH = 3`) and sliding-window rate limit (60 calls/minute per user). |
| **Cross-Tenant Data Tampering** | User attempting to execute tools on another user's behalf | All gateway requests validate JWT authentication; database queries strictly enforce `user_id` filtering. |

---

## 2. Cryptographic Security & Key Management

### 2.1 Authenticated Encryption
Yash.AI uses **Fernet** (`cryptography.fernet`), which combines:
- **AES-128-CBC** encryption
- **HMAC-SHA256** message authentication
- Cryptographically secure PKCS7 padding
- 128-bit timestamp checking to protect against stale data

### 2.2 Key Derivation
Keys are derived deterministically from the master server secret (`ENCRYPTION_KEY` or `JWT_SECRET_KEY`) using `PBKDF2HMAC`:
- **Hash function**: SHA-256
- **Iterations**: 100,000 iterations
- **Key length**: 32 bytes (base64 urlsafe encoded)

```python
# app/services/plugin_crypto.py
def _derive_fernet_key(secret: str) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"yash_ai_plugin_crypto_salt_v1",
        iterations=100000,
    )
    return base64.urlsafe_b64encode(kdf.derive(secret.encode("utf-8")))
```

### 2.3 Secret Masking
When credentials must be rendered in the UI (e.g. to indicate an active token):
- Characters after the first 3 and before the last 3 are masked: `ghp_1234567890abcdef` -> `ghp***def`.
- Plaintext secrets are decrypted in memory only at the instant of external HTTP execution.

---

## 3. Server-Side Request Forgery (SSRF) Defense

The `SSRFDefender` validates any URL passed as a tool parameter before any network request is dispatched:

1. **Protocol Restriction**: Only `http://` and `https://` schemes are permitted. Schemes such as `file://`, `gopher://`, `ftp://`, or `ldap://` are rejected immediately.
2. **Hostname & IP Filtering**:
   - `localhost`, `127.0.0.1`, `::1`
   - `0.0.0.0`
   - AWS / GCP / Azure metadata endpoint: `169.254.169.254`
   - Private IPv4 address ranges:
     - `10.0.0.0/8`
     - `172.16.0.0/12`
     - `192.168.0.0/16`
     - `100.64.0.0/10` (Carrier-grade NAT)

If any parameter resolves to a forbidden destination, the gateway aborts execution with status `SSRF_BLOCKED` and logs a security alert.

---

## 4. Human-in-the-Loop Confirmation Protocol

Operations classified under `WRITE` or `ADMIN` permission tiers must receive human authorization before execution.

```
AI Model                        Gateway                           Client UI
   │                               │                                  │
   ├─► Tool: slack.send_message ──►│                                  │
   │                               ├─► Requires confirmation? YES     │
   │                               ├─► Create ticket (UUID, 10m TTL)  │
   │◄─ Return CONFIRMATION_REQ ────┤                                  │
   │   (ticket_id, summary)        ├─────────────────────────────────►│
   │                               │                                  ├─► Display Modal
   │                               │                                  ├─► User clicks "Approve"
   │                               │◄─ POST /tools/confirm (APPROVED)─┤
   │                               │   (status = APPROVED)            │
   │                               │                                  ├─► Resume Chat Request
   │◄─ Execute Tool (ticket_id) ───┤◄─ POST /chat (ticket_id) ────────┤
   │                               ├─► Verify ticket == APPROVED      │
   │                               ├─► Consume ticket (Single-use)    │
   │                               ├─► Execute API request            │
   │◄─ Return Tool Result ─────────┤                                  │
   │                               │                                  │
```

---

## 5. Audit Logging

Every execution via `ToolGateway` produces an immutable audit record in the MongoDB `plugin_audit_logs` collection:
- `user_id`: Target user identity
- `tool_id`: Tool executed
- `status`: Execution outcome (`COMPLETED`, `CONFIRMATION_REQUIRED`, `PERMISSION_DENIED`, `SSRF_BLOCKED`, `FAILED`)
- `duration_ms`: Wall-clock execution time
- `params`: Sanitized parameter dictionary (secrets stripped)
- `timestamp`: UTC ISO timestamp
