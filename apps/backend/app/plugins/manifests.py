from typing import List, Dict
from app.models.plugin_models import PluginManifest, PluginToolMetadata


FIRST_PARTY_MANIFESTS: List[PluginManifest] = [
    # 1. Real-Time Web Search
    PluginManifest(
        id="web_search",
        name="Real-Time Web Search",
        description="Search the web for up-to-date facts, documentation, news, and technical references with SSRF defense.",
        version="1.0.0",
        author="Yash.AI",
        icon="Globe",
        category="Research",
        permissions=["web.read"],
        auth_type="none",
        is_first_party=True,
        tools=[
            PluginToolMetadata(
                id="web.search",
                name="Web Search",
                description="Search the public internet for fresh information, technical documentation, or breaking news.",
                permission="web.read",
                permission_tier="READ",
                requires_confirmation=False,
                input_schema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "The search query keywords"}
                    },
                    "required": ["query"]
                },
                output_schema={
                    "type": "object",
                    "properties": {
                        "results": {"type": "array", "description": "List of top search results"}
                    }
                }
            )
        ]
    ),

    # 2. User Files & Storage
    PluginManifest(
        id="files",
        name="User Files & Documents",
        description="Search, inspect, and summarize assets and files uploaded by or generated for the user.",
        version="1.0.0",
        author="Yash.AI",
        icon="Folder",
        category="Storage",
        permissions=["files.read", "files.delete"],
        auth_type="none",
        is_first_party=True,
        tools=[
            PluginToolMetadata(
                id="files.list",
                name="List Files",
                description="List uploaded or synthesized files belonging to the authenticated user.",
                permission="files.read",
                permission_tier="READ",
                requires_confirmation=False,
                input_schema={
                    "type": "object",
                    "properties": {
                        "limit": {"type": "integer", "description": "Maximum number of files to return", "default": 20}
                    }
                }
            ),
            PluginToolMetadata(
                id="files.search",
                name="Search Files",
                description="Search user files by filename or keyword.",
                permission="files.read",
                permission_tier="READ",
                requires_confirmation=False,
                input_schema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Filename or keyword to match"}
                    },
                    "required": ["query"]
                }
            ),
            PluginToolMetadata(
                id="files.read",
                name="Read File Details",
                description="Retrieve metadata, direct download URL, or text snippet of a user file.",
                permission="files.read",
                permission_tier="READ",
                requires_confirmation=False,
                input_schema={
                    "type": "object",
                    "properties": {
                        "file_id": {"type": "string", "description": "Unique identifier of the file"}
                    },
                    "required": ["file_id"]
                }
            ),
            PluginToolMetadata(
                id="files.delete",
                name="Delete File",
                description="Permanently delete an asset or file. Requires explicit human confirmation.",
                permission="files.delete",
                permission_tier="DELETE",
                requires_confirmation=True,
                input_schema={
                    "type": "object",
                    "properties": {
                        "file_id": {"type": "string", "description": "Unique identifier of the file to delete"}
                    },
                    "required": ["file_id"]
                }
            ),
        ]
    ),

    # 3. GitHub
    PluginManifest(
        id="github",
        name="GitHub",
        description="Inspect repositories, search code, list issues, and create issues on GitHub.",
        version="1.0.0",
        author="Yash.AI",
        icon="Github",
        category="Developer Tools",
        permissions=["github.read", "github.write"],
        auth_type="api_key",
        config_schema={
            "type": "object",
            "properties": {
                "token": {"type": "string", "description": "GitHub Personal Access Token (classic or fine-grained)", "secret": True}
            },
            "required": ["token"]
        },
        documentation_url="https://docs.github.com/en/rest",
        is_first_party=True,
        tools=[
            PluginToolMetadata(
                id="github.search_repositories",
                name="Search GitHub Repositories",
                description="Search public and accessible GitHub repositories by name, language, or topic.",
                permission="github.read",
                permission_tier="READ",
                requires_confirmation=False,
                input_schema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search query e.g. 'yash.ai user:octocat'"},
                        "limit": {"type": "integer", "default": 5}
                    },
                    "required": ["query"]
                }
            ),
            PluginToolMetadata(
                id="github.get_repository",
                name="Get Repository Details",
                description="Get detailed information about a GitHub repository including stars, forks, and description.",
                permission="github.read",
                permission_tier="READ",
                requires_confirmation=False,
                input_schema={
                    "type": "object",
                    "properties": {
                        "owner": {"type": "string", "description": "GitHub username or organization"},
                        "repo": {"type": "string", "description": "Repository name"}
                    },
                    "required": ["owner", "repo"]
                }
            ),
            PluginToolMetadata(
                id="github.list_issues",
                name="List Repository Issues",
                description="List open issues or pull requests for a given repository.",
                permission="github.read",
                permission_tier="READ",
                requires_confirmation=False,
                input_schema={
                    "type": "object",
                    "properties": {
                        "owner": {"type": "string", "description": "GitHub username or organization"},
                        "repo": {"type": "string", "description": "Repository name"},
                        "state": {"type": "string", "enum": ["open", "closed", "all"], "default": "open"}
                    },
                    "required": ["owner", "repo"]
                }
            ),
            PluginToolMetadata(
                id="github.get_issue",
                name="Get Issue Details",
                description="Get full title, body, labels, and status of a specific GitHub issue.",
                permission="github.read",
                permission_tier="READ",
                requires_confirmation=False,
                input_schema={
                    "type": "object",
                    "properties": {
                        "owner": {"type": "string", "description": "GitHub username or organization"},
                        "repo": {"type": "string", "description": "Repository name"},
                        "issue_number": {"type": "integer", "description": "Issue number"}
                    },
                    "required": ["owner", "repo", "issue_number"]
                }
            ),
            PluginToolMetadata(
                id="github.create_issue",
                name="Create GitHub Issue",
                description="Create a new issue in a GitHub repository. Requires explicit user confirmation.",
                permission="github.write",
                permission_tier="WRITE",
                requires_confirmation=True,
                input_schema={
                    "type": "object",
                    "properties": {
                        "owner": {"type": "string", "description": "GitHub username or organization"},
                        "repo": {"type": "string", "description": "Repository name"},
                        "title": {"type": "string", "description": "Issue title"},
                        "body": {"type": "string", "description": "Markdown body describing the issue"}
                    },
                    "required": ["owner", "repo", "title"]
                }
            ),
        ]
    ),

    # 4. Google Drive
    PluginManifest(
        id="google_drive",
        name="Google Drive",
        description="Search, view, and retrieve documents and spreadsheets from Google Drive.",
        version="1.0.0",
        author="Yash.AI",
        icon="HardDrive",
        category="Storage",
        permissions=["drive.read"],
        auth_type="api_key",
        config_schema={
            "type": "object",
            "properties": {
                "api_key": {"type": "string", "description": "Google Cloud API Key or OAuth Access Token", "secret": True}
            },
            "required": ["api_key"]
        },
        documentation_url="https://developers.google.com/drive/api",
        is_first_party=True,
        tools=[
            PluginToolMetadata(
                id="drive.search",
                name="Search Drive Files",
                description="Search user's Google Drive by file name or text query.",
                permission="drive.read",
                permission_tier="READ",
                requires_confirmation=False,
                input_schema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Filename or keyword query"}
                    },
                    "required": ["query"]
                }
            ),
            PluginToolMetadata(
                id="drive.get_file",
                name="Get Drive File Details",
                description="Get file metadata, mimeType, webViewLink, and size.",
                permission="drive.read",
                permission_tier="READ",
                requires_confirmation=False,
                input_schema={
                    "type": "object",
                    "properties": {
                        "file_id": {"type": "string", "description": "Google Drive File ID"}
                    },
                    "required": ["file_id"]
                }
            ),
            PluginToolMetadata(
                id="drive.download_file",
                name="Download File Content",
                description="Fetch the text/media preview or export link of a Google Doc or file.",
                permission="drive.read",
                permission_tier="READ",
                requires_confirmation=False,
                input_schema={
                    "type": "object",
                    "properties": {
                        "file_id": {"type": "string", "description": "Google Drive File ID"}
                    },
                    "required": ["file_id"]
                }
            ),
        ]
    ),

    # 5. Google Calendar
    PluginManifest(
        id="google_calendar",
        name="Google Calendar",
        description="Check upcoming schedules, list events, and create or update calendar meetings.",
        version="1.0.0",
        author="Yash.AI",
        icon="Calendar",
        category="Productivity",
        permissions=["calendar.read", "calendar.write"],
        auth_type="api_key",
        config_schema={
            "type": "object",
            "properties": {
                "api_key": {"type": "string", "description": "Google Calendar API Key or OAuth Token", "secret": True}
            },
            "required": ["api_key"]
        },
        documentation_url="https://developers.google.com/calendar/api",
        is_first_party=True,
        tools=[
            PluginToolMetadata(
                id="calendar.list_events",
                name="List Calendar Events",
                description="Fetch upcoming calendar events within a specified timeframe.",
                permission="calendar.read",
                permission_tier="READ",
                requires_confirmation=False,
                input_schema={
                    "type": "object",
                    "properties": {
                        "time_min": {"type": "string", "description": "ISO format start time (e.g. 2026-09-22T00:00:00Z)"},
                        "time_max": {"type": "string", "description": "ISO format end time"},
                        "max_results": {"type": "integer", "default": 10}
                    }
                }
            ),
            PluginToolMetadata(
                id="calendar.get_event",
                name="Get Event Details",
                description="Get detailed start, end, location, and description of a calendar event.",
                permission="calendar.read",
                permission_tier="READ",
                requires_confirmation=False,
                input_schema={
                    "type": "object",
                    "properties": {
                        "event_id": {"type": "string", "description": "Calendar Event ID"}
                    },
                    "required": ["event_id"]
                }
            ),
            PluginToolMetadata(
                id="calendar.create_event",
                name="Create Calendar Event",
                description="Create a new event or meeting. Requires explicit human confirmation.",
                permission="calendar.write",
                permission_tier="WRITE",
                requires_confirmation=True,
                input_schema={
                    "type": "object",
                    "properties": {
                        "summary": {"type": "string", "description": "Event title"},
                        "start_time": {"type": "string", "description": "Start datetime in ISO format"},
                        "end_time": {"type": "string", "description": "End datetime in ISO format"},
                        "description": {"type": "string", "description": "Event notes or description"}
                    },
                    "required": ["summary", "start_time", "end_time"]
                }
            ),
            PluginToolMetadata(
                id="calendar.update_event",
                name="Update Calendar Event",
                description="Update an existing calendar event. Requires explicit human confirmation.",
                permission="calendar.write",
                permission_tier="WRITE",
                requires_confirmation=True,
                input_schema={
                    "type": "object",
                    "properties": {
                        "event_id": {"type": "string", "description": "Calendar Event ID"},
                        "summary": {"type": "string", "description": "New title"},
                        "start_time": {"type": "string", "description": "New start datetime"},
                        "end_time": {"type": "string", "description": "New end datetime"}
                    },
                    "required": ["event_id"]
                }
            ),
            PluginToolMetadata(
                id="calendar.delete_event",
                name="Delete Calendar Event",
                description="Remove a scheduled event. Requires explicit human confirmation.",
                permission="calendar.write",
                permission_tier="DELETE",
                requires_confirmation=True,
                input_schema={
                    "type": "object",
                    "properties": {
                        "event_id": {"type": "string", "description": "Calendar Event ID"}
                    },
                    "required": ["event_id"]
                }
            ),
        ]
    ),

    # 6. Slack
    PluginManifest(
        id="slack",
        name="Slack",
        description="List workspace channels, search message archives, and send messages with confirmation.",
        version="1.0.0",
        author="Yash.AI",
        icon="MessageSquare",
        category="Communication",
        permissions=["slack.read", "slack.send"],
        auth_type="api_key",
        config_schema={
            "type": "object",
            "properties": {
                "token": {"type": "string", "description": "Slack Bot User OAuth Token (xoxb-...)", "secret": True}
            },
            "required": ["token"]
        },
        documentation_url="https://api.slack.com/web",
        is_first_party=True,
        tools=[
            PluginToolMetadata(
                id="slack.list_channels",
                name="List Slack Channels",
                description="List public and joined private channels in the Slack workspace.",
                permission="slack.read",
                permission_tier="READ",
                requires_confirmation=False,
                input_schema={
                    "type": "object",
                    "properties": {
                        "types": {"type": "string", "default": "public_channel,private_channel"}
                    }
                }
            ),
            PluginToolMetadata(
                id="slack.search_messages",
                name="Search Slack Messages",
                description="Search Slack workspace message history for keywords.",
                permission="slack.read",
                permission_tier="READ",
                requires_confirmation=False,
                input_schema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Search text"}
                    },
                    "required": ["query"]
                }
            ),
            PluginToolMetadata(
                id="slack.get_messages",
                name="Get Channel Messages",
                description="Fetch the latest messages from a specific Slack channel.",
                permission="slack.read",
                permission_tier="READ",
                requires_confirmation=False,
                input_schema={
                    "type": "object",
                    "properties": {
                        "channel_id": {"type": "string", "description": "Slack Channel ID (e.g. C01234567)"},
                        "limit": {"type": "integer", "default": 10}
                    },
                    "required": ["channel_id"]
                }
            ),
            PluginToolMetadata(
                id="slack.send_message",
                name="Send Slack Message",
                description="Send a message to a Slack channel. Requires explicit human confirmation.",
                permission="slack.send",
                permission_tier="PUBLISH",
                requires_confirmation=True,
                input_schema={
                    "type": "object",
                    "properties": {
                        "channel_id": {"type": "string", "description": "Slack Channel ID"},
                        "text": {"type": "string", "description": "Message text"}
                    },
                    "required": ["channel_id", "text"]
                }
            ),
        ]
    ),

    # 7. Notion
    PluginManifest(
        id="notion",
        name="Notion",
        description="Search Notion workspace databases and retrieve or create pages.",
        version="1.0.0",
        author="Yash.AI",
        icon="BookOpen",
        category="Productivity",
        permissions=["notion.read", "notion.write"],
        auth_type="api_key",
        config_schema={
            "type": "object",
            "properties": {
                "token": {"type": "string", "description": "Notion Internal Integration Secret (ntn_... or secret_...)", "secret": True}
            },
            "required": ["token"]
        },
        documentation_url="https://developers.notion.com/reference/intro",
        is_first_party=True,
        tools=[
            PluginToolMetadata(
                id="notion.search",
                name="Search Notion Workspace",
                description="Search Notion workspace for pages or databases matching a query.",
                permission="notion.read",
                permission_tier="READ",
                requires_confirmation=False,
                input_schema={
                    "type": "object",
                    "properties": {
                        "query": {"type": "string", "description": "Text to search in titles and text"}
                    },
                    "required": ["query"]
                }
            ),
            PluginToolMetadata(
                id="notion.get_page",
                name="Get Notion Page",
                description="Retrieve the title, properties, and content of a Notion page.",
                permission="notion.read",
                permission_tier="READ",
                requires_confirmation=False,
                input_schema={
                    "type": "object",
                    "properties": {
                        "page_id": {"type": "string", "description": "32-character Notion Page ID"}
                    },
                    "required": ["page_id"]
                }
            ),
            PluginToolMetadata(
                id="notion.create_page",
                name="Create Notion Page",
                description="Create a new page in a Notion database or page. Requires explicit human confirmation.",
                permission="notion.write",
                permission_tier="WRITE",
                requires_confirmation=True,
                input_schema={
                    "type": "object",
                    "properties": {
                        "parent_page_id": {"type": "string", "description": "Parent Page ID or Database ID"},
                        "title": {"type": "string", "description": "Title of the new page"},
                        "content": {"type": "string", "description": "Markdown text content for the page body"}
                    },
                    "required": ["parent_page_id", "title"]
                }
            ),
        ]
    ),
]


MANIFEST_BY_ID: Dict[str, PluginManifest] = {m.id: m for m in FIRST_PARTY_MANIFESTS}
