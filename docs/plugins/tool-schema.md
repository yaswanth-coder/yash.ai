# Yash.AI Tool Schema Specification

This document defines the standardized JSON schema contract for tool inputs, tool outputs, and error handling in the Yash.AI Tool Execution Gateway.

---

## 1. Tool Definition Schema

Every tool exposed by a plugin conforms to the following schema:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "ToolContract",
  "type": "object",
  "required": ["id", "name", "description", "category", "permission_tier", "input_schema"],
  "properties": {
    "id": {
      "type": "string",
      "description": "Unique namespaced identifier (e.g. 'github.create_issue')"
    },
    "name": {
      "type": "string",
      "description": "Human-readable tool title"
    },
    "description": {
      "type": "string",
      "description": "Detailed explanation instructing the LLM when and how to call this tool"
    },
    "category": {
      "type": "string",
      "enum": ["Productivity", "Developer Tools", "Communication", "Storage", "Research", "Finance", "Education", "Automation", "Data", "AI"]
    },
    "plugin_id": {
      "type": "string",
      "description": "Parent plugin identifier"
    },
    "required_permission": {
      "type": "string",
      "description": "Permission key checked against user grants (e.g. 'github.write')"
    },
    "permission_tier": {
      "type": "string",
      "enum": ["read", "write", "admin"]
    },
    "requires_confirmation": {
      "type": "boolean",
      "description": "Whether explicit human approval is required prior to execution"
    },
    "input_schema": {
      "type": "object",
      "description": "Standard JSON Schema for parameter validation"
    }
  }
}
```

---

## 2. Gateway Execution Response Schema

The Tool Execution Gateway returns a structured response for all invocations:

```json
{
  "type": "object",
  "required": ["success", "status"],
  "properties": {
    "success": { "type": "boolean" },
    "status": {
      "type": "string",
      "enum": [
        "COMPLETED",
        "CONFIRMATION_REQUIRED",
        "CONFIRMATION_INVALID",
        "PLUGIN_AUTH_REQUIRED",
        "PLUGIN_DISABLED",
        "PERMISSION_DENIED",
        "RATE_LIMITED",
        "SSRF_BLOCKED",
        "TIMEOUT",
        "NOT_FOUND",
        "FAILED"
      ]
    },
    "data": {
      "type": "object",
      "description": "Sanitized tool execution output payload"
    },
    "error": {
      "type": "string",
      "description": "Descriptive error message if success is false"
    },
    "ticket_id": {
      "type": "string",
      "description": "Present when status is CONFIRMATION_REQUIRED"
    },
    "action_summary": {
      "type": "string",
      "description": "Human-readable summary of requested action"
    },
    "params": {
      "type": "object",
      "description": "Parameters requiring confirmation"
    },
    "duration_ms": {
      "type": "integer",
      "description": "Execution wall-clock time in milliseconds"
    }
  }
}
```

---

## 3. Status Code Reference

| Status Code | Description | Next Agent / Client Step |
| :--- | :--- | :--- |
| `COMPLETED` | Tool executed successfully. | Feed `data` into LLM context to continue reasoning. |
| `CONFIRMATION_REQUIRED` | Tool requires user approval. | Present `ConfirmationModal` to user with `ticket_id`. |
| `PLUGIN_AUTH_REQUIRED` | Missing or expired credentials. | Prompt user to configure credentials in `/plugins`. |
| `PERMISSION_DENIED` | Missing required permission grant. | Instruct user to update plugin permissions. |
| `SSRF_BLOCKED` | Parameter contains forbidden private/loopback URL. | Inform user that internal network targets are prohibited. |
| `RATE_LIMITED` | User exceeded 60 requests/minute. | Pause and retry after backoff interval. |
| `TIMEOUT` | Operation exceeded 30s timeout. | Inform user external service timed out. |
