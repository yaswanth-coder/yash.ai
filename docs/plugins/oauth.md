# Yash.AI OAuth 2.0 PKCE Integration Specification

This document details the OAuth 2.0 protocol implementation for third-party plugins in Yash.AI requiring user delegation (e.g., Google Workspace, GitHub, Slack, Notion).

---

## 1. Flow Architecture

Yash.AI implements **OAuth 2.0 with Proof Key for Code Exchange (PKCE, RFC 7636)** for all public and confidential client delegations.

```
User Browser                       Yash.AI Gateway                 External OAuth Provider
     │                                   │                                    │
     ├─ 1. Click "Connect GitHub" ──────►│                                    │
     │                                   ├─ 2. Generate code_verifier         │
     │                                   │     & code_challenge (SHA-256)     │
     │                                   ├─ 3. Store state in session         │
     │◄─ 4. Redirect to Auth Provider ───┤                                    │
     │                                                                        │
     ├─ 5. Authenticate & Grant Scopes ──────────────────────────────────────►│
     │                                                                        │
     │◄─ 6. Redirect to /oauth/callback?code=AUTH_CODE&state=STATE ───────────┤
     │                                                                        │
     ├─ 7. Forward Callback ────────────►│                                    │
     │                                   ├─ 8. Verify state & retrieve verifier
     │                                   ├─ 9. Exchange code + verifier ─────►│
     │                                   │◄─ 10. Return access & refresh token│
     │                                   ├─ 11. Fernet encrypt tokens         │
     │                                   ├─ 12. Save to `plugin_connections`  │
     │◄─ 13. Return Connection Success ──┤                                    │
```

---

## 2. Token Lifecycle Management

### 2.1 Storage
- Tokens are never stored in plaintext.
- Stored fields in `plugin_connections`:
  ```json
  {
    "user_id": "usr_9981",
    "plugin_id": "github",
    "auth_type": "oauth2",
    "encrypted_credentials": {
      "access_token": "gAAAAABl...ciphertext...",
      "refresh_token": "gAAAAABl...ciphertext...",
      "expires_at": 1726880000
    },
    "status": "CONNECTED",
    "updated_at": "2026-09-21T18:00:00Z"
  }
  ```

### 2.2 Refresh Token Rotation
When a tool execution occurs:
1. `ToolGateway` checks `expires_at`.
2. If token is within 5 minutes of expiration, `OAuthManager` calls the provider's `/token` endpoint with the decrypted `refresh_token`.
3. The new `access_token` and rotated `refresh_token` are immediately re-encrypted with Fernet and updated atomically in MongoDB.

---

## 3. Scopes & Least Privilege

Plugins must only request the minimal set of scopes necessary for their functionality. For example:
- **GitHub**: `read:user`, `repo` (only when `github.write` is explicitly granted)
- **Google Drive**: `https://www.googleapis.com/auth/drive.readonly`
- **Google Calendar**: `https://www.googleapis.com/auth/calendar.events`
- **Slack**: `channels:read`, `chat:write`
- **Notion**: `pages:read`, `pages:write`
