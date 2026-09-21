import os
import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger("yash.ai.plugins.github")

GITHUB_API_BASE = "https://api.github.com"


async def _get_github_token(user_id: Optional[str]) -> Optional[str]:
    if user_id:
        from app.plugins.service import get_plugin_manager
        creds = await get_plugin_manager().get_plugin_credentials(user_id, "github")
        if creds and creds.get("token"):
            return creds["token"]
    # Fallback to system environment if configured
    return os.getenv("GITHUB_TOKEN") or None


async def execute_github_tool(tool_name: str, params: Dict[str, Any], user_id: Optional[str] = None) -> Dict[str, Any]:
    token = await _get_github_token(user_id)
    if not token:
        return {
            "status": "PLUGIN_AUTH_REQUIRED",
            "error": "GitHub Personal Access Token is required. Please configure your GitHub token in Settings -> Plugins -> GitHub.",
            "instructions": "Create a GitHub Personal Access Token at https://github.com/settings/tokens and paste it in the Yash.AI Plugin settings."
        }

    headers = {
        "Authorization": f"Bearer {token.strip()}",
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Yash-AI-Platform/1.0",
    }

    async with httpx.AsyncClient(headers=headers, timeout=20.0) as client:
        try:
            if tool_name == "github.search_repositories":
                query = params.get("query", "")
                limit = min(int(params.get("limit", 5)), 10)
                resp = await client.get(f"{GITHUB_API_BASE}/search/repositories", params={"q": query, "per_page": limit})
                if resp.status_code == 401:
                    return {"status": "PLUGIN_AUTH_REQUIRED", "error": "Invalid GitHub token provided."}
                if resp.status_code == 403:
                    return {"status": "PLUGIN_RATE_LIMITED", "error": "GitHub API rate limit exceeded."}
                resp.raise_for_status()
                data = resp.json()
                items = [
                    {
                        "full_name": item.get("full_name"),
                        "description": item.get("description"),
                        "stars": item.get("stargazers_count"),
                        "language": item.get("language"),
                        "url": item.get("html_url"),
                    }
                    for item in data.get("items", [])[:limit]
                ]
                return {"total_count": data.get("total_count", 0), "repositories": items}

            elif tool_name == "github.get_repository":
                owner = params["owner"]
                repo = params["repo"]
                resp = await client.get(f"{GITHUB_API_BASE}/repos/{owner}/{repo}")
                if resp.status_code == 404:
                    return {"status": "NOT_FOUND", "error": f"Repository '{owner}/{repo}' not found on GitHub."}
                resp.raise_for_status()
                data = resp.json()
                return {
                    "full_name": data.get("full_name"),
                    "description": data.get("description"),
                    "stars": data.get("stargazers_count"),
                    "forks": data.get("forks_count"),
                    "open_issues": data.get("open_issues_count"),
                    "default_branch": data.get("default_branch"),
                    "url": data.get("html_url"),
                }

            elif tool_name == "github.list_issues":
                owner = params["owner"]
                repo = params["repo"]
                state = params.get("state", "open")
                resp = await client.get(f"{GITHUB_API_BASE}/repos/{owner}/{repo}/issues", params={"state": state, "per_page": 10})
                resp.raise_for_status()
                issues = [
                    {
                        "number": i.get("number"),
                        "title": i.get("title"),
                        "state": i.get("state"),
                        "author": i.get("user", {}).get("login"),
                        "created_at": i.get("created_at"),
                        "url": i.get("html_url"),
                    }
                    for i in resp.json()
                ]
                return {"repository": f"{owner}/{repo}", "issues": issues}

            elif tool_name == "github.get_issue":
                owner = params["owner"]
                repo = params["repo"]
                issue_number = params["issue_number"]
                resp = await client.get(f"{GITHUB_API_BASE}/repos/{owner}/{repo}/issues/{issue_number}")
                resp.raise_for_status()
                i = resp.json()
                return {
                    "number": i.get("number"),
                    "title": i.get("title"),
                    "body": (i.get("body") or "")[:2000],
                    "state": i.get("state"),
                    "author": i.get("user", {}).get("login"),
                    "labels": [l.get("name") for l in i.get("labels", [])],
                    "url": i.get("html_url"),
                }

            elif tool_name == "github.create_issue":
                owner = params["owner"]
                repo = params["repo"]
                payload = {
                    "title": params["title"],
                    "body": params.get("body", "")
                }
                resp = await client.post(f"{GITHUB_API_BASE}/repos/{owner}/{repo}/issues", json=payload)
                resp.raise_for_status()
                created = resp.json()
                return {
                    "success": True,
                    "issue_number": created.get("number"),
                    "title": created.get("title"),
                    "url": created.get("html_url"),
                    "message": f"Successfully created issue #{created.get('number')} in {owner}/{repo}"
                }

            else:
                return {"status": "INVALID_TOOL", "error": f"Unknown GitHub tool: {tool_name}"}

        except httpx.HTTPStatusError as ex:
            logger.error(f"[GitHubTool] HTTP status error: {ex.response.status_code} - {ex.response.text}")
            return {"status": "PLUGIN_ERROR", "error": f"GitHub API error ({ex.response.status_code}): {ex.response.text[:200]}"}
        except Exception as ex:
            logger.error(f"[GitHubTool] Unexpected error: {ex}")
            return {"status": "PLUGIN_ERROR", "error": str(ex)}
