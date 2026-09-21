import os
import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("yash.ai.plugins.notion")

NOTION_API_BASE = "https://api.notion.com/v1"


async def _get_notion_token(user_id: Optional[str]) -> Optional[str]:
    if user_id:
        from app.plugins.service import get_plugin_manager
        creds = await get_plugin_manager().get_plugin_credentials(user_id, "notion")
        if creds and creds.get("token"):
            return creds["token"]
    return os.getenv("NOTION_API_KEY") or None


async def execute_notion_tool(tool_name: str, params: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    token = await _get_notion_token(user_id)
    if not token:
        return {
            "status": "PLUGIN_AUTH_REQUIRED",
            "error": "Notion Internal Integration Token required. Please configure your token in Settings -> Plugins -> Notion.",
            "instructions": "Create an integration at notion.so/my-integrations, copy the 'Internal Integration Secret', and share your Notion pages/databases with the integration."
        }

    headers = {
        "Authorization": f"Bearer {token.strip()}",
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(headers=headers, timeout=20.0) as client:
        try:
            if tool_name == "notion.search":
                query = params.get("query", "")
                resp = await client.post(f"{NOTION_API_BASE}/search", json={"query": query, "page_size": 10})
                resp.raise_for_status()
                data = resp.json()
                results = []
                for item in data.get("results", []):
                    title = "Untitled"
                    props = item.get("properties", {})
                    for p in props.values():
                        if p.get("type") == "title" and p.get("title"):
                            title = "".join([t.get("plain_text", "") for t in p.get("title", [])])
                            break
                    results.append({
                        "id": item.get("id"),
                        "object": item.get("object"),
                        "title": title,
                        "url": item.get("url"),
                    })
                return {"results": results}

            elif tool_name == "notion.get_page":
                page_id = params["page_id"].replace("-", "")
                resp = await client.get(f"{NOTION_API_BASE}/pages/{page_id}")
                resp.raise_for_status()
                data = resp.json()
                return {
                    "id": data.get("id"),
                    "created_time": data.get("created_time"),
                    "url": data.get("url"),
                    "archived": data.get("archived"),
                }

            elif tool_name == "notion.create_page":
                parent_id = params["parent_page_id"].replace("-", "")
                title = params["title"]
                content = params.get("content", "")

                payload = {
                    "parent": {"page_id": parent_id},
                    "properties": {
                        "title": {
                            "title": [{"text": {"content": title}}]
                        }
                    },
                    "children": [
                        {
                            "object": "block",
                            "type": "paragraph",
                            "paragraph": {
                                "rich_text": [{"type": "text", "text": {"content": content[:2000]}}]
                            }
                        }
                    ] if content else []
                }
                resp = await client.post(f"{NOTION_API_BASE}/pages", json=payload)
                resp.raise_for_status()
                created = resp.json()
                return {
                    "success": True,
                    "id": created.get("id"),
                    "url": created.get("url"),
                    "message": f"Successfully created Notion page '{title}'"
                }

            return {"status": "INVALID_TOOL", "error": f"Unknown tool '{tool_name}'"}

        except httpx.HTTPStatusError as ex:
            return {"status": "PLUGIN_ERROR", "error": f"Notion API error ({ex.response.status_code}): {ex.response.text[:200]}"}
        except Exception as ex:
            return {"status": "PLUGIN_ERROR", "error": str(ex)}
