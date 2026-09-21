# Yash.AI Plugin Developer Guide

This guide explains how to build, test, and register plugins for the Yash.AI ecosystem.

---

## 1. Plugin Structure

A plugin in Yash.AI is defined by a declarative manifest (`plugin.json` or Python `PluginManifest`) specifying its identity, authentication mechanism, capabilities, and the individual tools it exposes to the AI.

```
my-custom-plugin/
├── plugin.json               # Manifest definition
├── README.md                 # Documentation & installation instructions
└── src/
    ├── __init__.py
    ├── client.py             # External API client logic
    └── tools.py              # Tool handler functions
```

---

## 2. Plugin Manifest (`plugin.json`)

The manifest defines all metadata required by the Yash.AI Registry and Security Gateway:

```json
{
  "id": "jira",
  "name": "Jira Cloud",
  "description": "Search Jira issues, view sprint boards, and create development tickets directly through Yash.AI.",
  "version": "1.0.0",
  "author": "Yash.AI Community",
  "icon": "Blocks",
  "category": "Developer Tools",
  "auth_type": "api_key",
  "permissions": [
    "jira.read",
    "jira.write"
  ],
  "config_schema": {
    "api_token": {
      "type": "string",
      "title": "API Token",
      "description": "Atlassian API token generated from your Atlassian account.",
      "required": true,
      "secret": true
    },
    "email": {
      "type": "string",
      "title": "Account Email",
      "description": "Email address associated with your Atlassian account.",
      "required": true,
      "secret": false
    },
    "domain": {
      "type": "string",
      "title": "Jira Domain",
      "description": "Your Jira subdomain (e.g., yourcompany.atlassian.net).",
      "required": true,
      "secret": false
    }
  },
  "tools": [
    {
      "id": "jira.search_issues",
      "name": "Search Jira Issues",
      "description": "Search Jira issues using JQL syntax or text keywords.",
      "permission": "jira.read",
      "permission_tier": "read",
      "requires_confirmation": false,
      "input_schema": {
        "type": "object",
        "properties": {
          "jql": { "type": "string", "description": "JQL query string" },
          "max_results": { "type": "integer", "default": 10 }
        },
        "required": ["jql"]
      }
    },
    {
      "id": "jira.create_issue",
      "name": "Create Jira Issue",
      "description": "Creates a new ticket in the specified Jira project.",
      "permission": "jira.write",
      "permission_tier": "write",
      "requires_confirmation": true,
      "input_schema": {
        "type": "object",
        "properties": {
          "project_key": { "type": "string", "description": "Project key, e.g. PROJ" },
          "summary": { "type": "string", "description": "Issue title" },
          "description": { "type": "string", "description": "Issue details" },
          "issue_type": { "type": "string", "default": "Task" }
        },
        "required": ["project_key", "summary"]
      }
    }
  ]
}
```

---

## 3. Writing Tool Handlers

Tool handlers in Yash.AI are asynchronous Python functions. Handlers receive the decrypted user credentials and parameters from the Gateway:

```python
from typing import Dict, Any

async def create_jira_issue(
    params: Dict[str, Any],
    credentials: Dict[str, str],
    user_id: str
) -> Dict[str, Any]:
    api_token = credentials.get("api_token")
    email = credentials.get("email")
    domain = credentials.get("domain")

    if not api_token or not email or not domain:
        return {
            "success": False,
            "error": "Missing Jira credentials. Please configure the Jira plugin in Settings.",
            "status": "PLUGIN_AUTH_REQUIRED"
        }

    # Execute HTTP call via httpx with SSRF validation
    ...
    return {
        "success": True,
        "data": {
            "key": "PROJ-123",
            "url": f"https://{domain}/browse/PROJ-123"
        }
    }
```

---

## 4. Registering in the Tool Registry

Register the tool with the central `ToolRegistry`:

```python
from app.tools.registry import get_tool_registry
from app.tools.contracts import ToolContract, ToolPermissionTier

registry = get_tool_registry()

registry.register_tool(ToolContract(
    id="jira.create_issue",
    name="Create Jira Issue",
    description="Creates a new ticket in the specified Jira project.",
    category="Developer Tools",
    plugin_id="jira",
    required_permission="jira.write",
    permission_tier=ToolPermissionTier.WRITE,
    requires_confirmation=True,
    input_schema={...},
    handler=create_jira_issue
))
```

---

## 5. Testing Your Plugin

Yash.AI provides automated testing utilities for mocking the Tool Execution Gateway:

```python
import pytest
from app.tools.gateway import ToolGateway

@pytest.mark.asyncio
async def test_jira_tool():
    gateway = ToolGateway()
    result = await gateway.execute_tool(
        tool_id="jira.search_issues",
        params={"jql": "project = PROJ"},
        user_id="test_user"
    )
    assert result["success"] is True
```
