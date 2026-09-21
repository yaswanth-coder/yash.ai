import os
import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("yash.ai.plugins.slack")

SLACK_API_BASE = "https://slack.com/api"


async def _get_slack_token(user_id: Optional[str]) -> Optional[str]:
    if user_id:
        from app.plugins.service import get_plugin_manager
        creds = await get_plugin_manager().get_plugin_credentials(user_id, "slack")
        if creds and creds.get("token"):
            return creds["token"]
    return os.getenv("SLACK_BOT_TOKEN") or None


async def execute_slack_tool(tool_name: str, params: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    token = await _get_slack_token(user_id)
    if not token:
        return {
            "status": "PLUGIN_AUTH_REQUIRED",
            "error": "Slack Bot User OAuth Token required. Please configure your Slack token (starts with 'xoxb-') in Settings -> Plugins -> Slack.",
            "instructions": "Create a Slack App at api.slack.com/apps, add channels:read, chat:write scopes, install to workspace, and copy the Bot User OAuth Token."
        }

    headers = {
        "Authorization": f"Bearer {token.strip()}",
        "Content-Type": "application/json; charset=utf-8",
    }

    async with httpx.AsyncClient(headers=headers, timeout=20.0) as client:
        try:
            if tool_name == "slack.list_channels":
                types = params.get("types", "public_channel,private_channel")
                resp = await client.get(f"{SLACK_API_BASE}/conversations.list", params={"types": types, "limit": 20})
                data = resp.json()
                if not data.get("ok"):
                    return {"status": "PLUGIN_ERROR", "error": data.get("error", "Slack API error")}
                channels = [
                    {"id": c.get("id"), "name": c.get("name"), "is_private": c.get("is_private"), "topic": c.get("topic", {}).get("value")}
                    for c in data.get("channels", [])
                ]
                return {"channels": channels}

            elif tool_name == "slack.get_messages":
                channel_id = params["channel_id"]
                limit = min(int(params.get("limit", 10)), 20)
                resp = await client.get(f"{SLACK_API_BASE}/conversations.history", params={"channel": channel_id, "limit": limit})
                data = resp.json()
                if not data.get("ok"):
                    return {"status": "PLUGIN_ERROR", "error": data.get("error", "Failed to fetch messages")}
                messages = [
                    {"user": m.get("user"), "text": m.get("text"), "ts": m.get("ts")}
                    for m in data.get("messages", [])
                ]
                return {"channel_id": channel_id, "messages": messages}

            elif tool_name == "slack.search_messages":
                query = params["query"]
                resp = await client.get(f"{SLACK_API_BASE}/search.messages", params={"query": query, "count": 5})
                data = resp.json()
                if not data.get("ok"):
                    return {"status": "PLUGIN_ERROR", "error": data.get("error", "Failed to search messages")}
                matches = data.get("messages", {}).get("matches", [])
                results = [
                    {"channel": m.get("channel", {}).get("name"), "user": m.get("username"), "text": m.get("text"), "permalink": m.get("permalink")}
                    for m in matches
                ]
                return {"query": query, "results": results}

            elif tool_name == "slack.send_message":
                channel_id = params["channel_id"]
                text = params["text"]
                resp = await client.post(f"{SLACK_API_BASE}/chat.postMessage", json={"channel": channel_id, "text": text})
                data = resp.json()
                if not data.get("ok"):
                    return {"status": "PLUGIN_ERROR", "error": data.get("error", "Failed to post message")}
                return {
                    "success": True,
                    "channel": data.get("channel"),
                    "ts": data.get("ts"),
                    "message": f"Successfully sent message to {channel_id}"
                }

            return {"status": "INVALID_TOOL", "error": f"Unknown tool '{tool_name}'"}

        except Exception as ex:
            return {"status": "PLUGIN_ERROR", "error": str(ex)}
