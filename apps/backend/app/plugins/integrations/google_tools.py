import os
import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("yash.ai.plugins.google")

GOOGLE_DRIVE_BASE = "https://www.googleapis.com/drive/v3"
GOOGLE_CALENDAR_BASE = "https://www.googleapis.com/calendar/v3"


async def _get_google_credentials(user_id: Optional[str], plugin_id: str) -> Optional[str]:
    if user_id:
        from app.plugins.service import get_plugin_manager
        creds = await get_plugin_manager().get_plugin_credentials(user_id, plugin_id)
        if creds and creds.get("api_key"):
            return creds["api_key"]
    return os.getenv("GOOGLE_API_KEY") or None


# ==========================================
# Google Drive Tools
# ==========================================
async def execute_google_drive_tool(tool_name: str, params: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    api_key = await _get_google_credentials(user_id, "google_drive")
    if not api_key:
        return {
            "status": "PLUGIN_AUTH_REQUIRED",
            "error": "Google Drive authentication required. Please configure your Google Cloud API key or OAuth token in Settings -> Plugins -> Google Drive.",
            "instructions": "Configure your Google Cloud API key with Drive API enabled at console.cloud.google.com."
        }

    headers = {
        "Authorization": f"Bearer {api_key}" if not api_key.startswith("AIza") else None,
        "Accept": "application/json",
    }
    headers = {k: v for k, v in headers.items() if v}

    async with httpx.AsyncClient(headers=headers, timeout=20.0) as client:
        try:
            if tool_name == "drive.search":
                q = params.get("query", "")
                drive_params = {"q": f"name contains '{q}' and trashed = false" if q else "trashed = false", "pageSize": 10}
                if api_key.startswith("AIza"):
                    drive_params["key"] = api_key

                resp = await client.get(f"{GOOGLE_DRIVE_BASE}/files", params=drive_params)
                resp.raise_for_status()
                files = resp.json().get("files", [])
                return {
                    "files": [
                        {"id": f.get("id"), "name": f.get("name"), "mimeType": f.get("mimeType")}
                        for f in files
                    ]
                }

            elif tool_name == "drive.get_file":
                file_id = params["file_id"]
                drive_params = {"fields": "id,name,mimeType,size,webViewLink,createdTime,modifiedTime"}
                if api_key.startswith("AIza"):
                    drive_params["key"] = api_key

                resp = await client.get(f"{GOOGLE_DRIVE_BASE}/files/{file_id}", params=drive_params)
                resp.raise_for_status()
                return resp.json()

            elif tool_name == "drive.download_file":
                file_id = params["file_id"]
                drive_params = {"alt": "media"}
                if api_key.startswith("AIza"):
                    drive_params["key"] = api_key

                resp = await client.get(f"{GOOGLE_DRIVE_BASE}/files/{file_id}", params=drive_params)
                resp.raise_for_status()
                # For safety, extract preview
                content_preview = resp.text[:3000] if len(resp.text) > 0 else "[Binary content]"
                return {"file_id": file_id, "content_preview": content_preview}

            return {"status": "INVALID_TOOL", "error": f"Unknown tool '{tool_name}'"}

        except httpx.HTTPStatusError as ex:
            return {"status": "PLUGIN_ERROR", "error": f"Google Drive API returned {ex.response.status_code}: {ex.response.text[:200]}"}
        except Exception as ex:
            return {"status": "PLUGIN_ERROR", "error": str(ex)}


# ==========================================
# Google Calendar Tools
# ==========================================
async def execute_google_calendar_tool(tool_name: str, params: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    api_key = await _get_google_credentials(user_id, "google_calendar")
    if not api_key:
        return {
            "status": "PLUGIN_AUTH_REQUIRED",
            "error": "Google Calendar authentication required. Please connect your Google account or API key in Settings -> Plugins -> Google Calendar."
        }

    headers = {
        "Authorization": f"Bearer {api_key}" if not api_key.startswith("AIza") else None,
        "Accept": "application/json",
    }
    headers = {k: v for k, v in headers.items() if v}

    async with httpx.AsyncClient(headers=headers, timeout=20.0) as client:
        try:
            if tool_name == "calendar.list_events":
                cal_params = {
                    "maxResults": min(int(params.get("max_results", 10)), 20),
                    "singleEvents": "true",
                    "orderBy": "startTime",
                }
                if params.get("time_min"):
                    cal_params["timeMin"] = params["time_min"]
                if api_key.startswith("AIza"):
                    cal_params["key"] = api_key

                resp = await client.get(f"{GOOGLE_CALENDAR_BASE}/calendars/primary/events", params=cal_params)
                resp.raise_for_status()
                items = resp.json().get("items", [])
                events = [
                    {
                        "id": ev.get("id"),
                        "summary": ev.get("summary"),
                        "start": ev.get("start"),
                        "end": ev.get("end"),
                        "location": ev.get("location"),
                    }
                    for ev in items
                ]
                return {"events": events}

            elif tool_name == "calendar.get_event":
                event_id = params["event_id"]
                cal_params = {}
                if api_key.startswith("AIza"):
                    cal_params["key"] = api_key
                resp = await client.get(f"{GOOGLE_CALENDAR_BASE}/calendars/primary/events/{event_id}", params=cal_params)
                resp.raise_for_status()
                ev = resp.json()
                return {
                    "id": ev.get("id"),
                    "summary": ev.get("summary"),
                    "description": ev.get("description"),
                    "start": ev.get("start"),
                    "end": ev.get("end"),
                    "location": ev.get("location"),
                }

            elif tool_name == "calendar.create_event":
                payload = {
                    "summary": params["summary"],
                    "description": params.get("description", ""),
                    "start": {"dateTime": params["start_time"]},
                    "end": {"dateTime": params["end_time"]},
                }
                resp = await client.post(f"{GOOGLE_CALENDAR_BASE}/calendars/primary/events", json=payload)
                resp.raise_for_status()
                ev = resp.json()
                return {
                    "success": True,
                    "event_id": ev.get("id"),
                    "summary": ev.get("summary"),
                    "htmlLink": ev.get("htmlLink"),
                    "message": f"Successfully scheduled '{ev.get('summary')}'"
                }

            elif tool_name == "calendar.update_event":
                event_id = params["event_id"]
                payload = {}
                if "summary" in params:
                    payload["summary"] = params["summary"]
                if "start_time" in params:
                    payload["start"] = {"dateTime": params["start_time"]}
                if "end_time" in params:
                    payload["end"] = {"dateTime": params["end_time"]}

                resp = await client.patch(f"{GOOGLE_CALENDAR_BASE}/calendars/primary/events/{event_id}", json=payload)
                resp.raise_for_status()
                return {"success": True, "event": resp.json()}

            elif tool_name == "calendar.delete_event":
                event_id = params["event_id"]
                resp = await client.delete(f"{GOOGLE_CALENDAR_BASE}/calendars/primary/events/{event_id}")
                resp.raise_for_status()
                return {"success": True, "message": f"Deleted event {event_id}"}

            return {"status": "INVALID_TOOL", "error": f"Unknown tool '{tool_name}'"}

        except httpx.HTTPStatusError as ex:
            return {"status": "PLUGIN_ERROR", "error": f"Google Calendar API error ({ex.response.status_code}): {ex.response.text[:200]}"}
        except Exception as ex:
            return {"status": "PLUGIN_ERROR", "error": str(ex)}
