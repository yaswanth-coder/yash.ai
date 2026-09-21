import inspect
import logging
from typing import Dict, Any, List, Optional
from app.tools.contracts import ToolDefinition, PermissionTier
from app.tools.web_search import WebSearchTool
from app.tools.calculator import CalculatorTool
from app.tools.python_sandbox import PythonSandboxTool
from app.tools.file_tools import (
    list_user_files,
    read_user_file_metadata,
    delete_user_file,
    search_user_files,
    summarize_user_file,
)
from app.tools.three_d_tools import THREE_D_TOOLS
from app.plugins.integrations.github_tool import execute_github_tool
from app.plugins.integrations.google_tools import execute_google_drive_tool, execute_google_calendar_tool
from app.plugins.integrations.slack_tool import execute_slack_tool
from app.plugins.integrations.notion_tool import execute_notion_tool

logger = logging.getLogger("yash.ai.tools.registry")


class ToolRegistry:
    """
    Central repository for all Yash.AI first-party tools and plugins.
    Enforces typed metadata, strict schemas, and permission tiers.
    """

    def __init__(self):
        self._tools: Dict[str, ToolDefinition] = {}
        self._web_search = WebSearchTool()
        self._calculator = CalculatorTool()
        self._python_sandbox = PythonSandboxTool()
        self._register_default_tools()

    def register(self, tool: ToolDefinition):
        self._tools[tool.id] = tool
        logger.info(f"[ToolRegistry] Registered tool '{tool.id}' [{tool.permission_tier}]")

    def get(self, tool_id: str) -> Optional[ToolDefinition]:
        return self._tools.get(tool_id)

    def list_tools(self, user_permissions: Optional[List[str]] = None) -> List[ToolDefinition]:
        return list(self._tools.values())

    def _register_default_tools(self):
        # 1. Web Search
        async def _exec_web_search(query: str, **kwargs):
            res = await self._web_search.execute(query=query)
            return res.data if hasattr(res, "data") else res

        self.register(ToolDefinition(
            id="web.search",
            name="Real-time Web Search",
            description="Search the web for up-to-date facts, documentation, news, and technical references.",
            category="search",
            permission_tier=PermissionTier.READ,
            input_schema={"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]},
            output_schema={"type": "object", "properties": {"results": {"type": "array"}}},
            requires_confirmation=False,
            plugin_id="web_search",
            required_permission="web.read",
            handler=_exec_web_search
        ))

        # 2. Math Calculator
        async def _exec_calculator(expression: str, **kwargs):
            res = await self._calculator.execute(expression=expression)
            val = res.output if hasattr(res, "output") else res
            return {"result": val}

        self.register(ToolDefinition(
            id="calculator.evaluate",
            name="Mathematical Evaluation Engine",
            description="Evaluate complex mathematical and scientific equations with AST safety.",
            category="compute",
            permission_tier=PermissionTier.READ,
            input_schema={"type": "object", "properties": {"expression": {"type": "string"}}, "required": ["expression"]},
            output_schema={"type": "object", "properties": {"result": {"type": "number"}}},
            requires_confirmation=False,
            handler=_exec_calculator
        ))

        # 3. Python Sandbox
        async def _exec_python(code: str, **kwargs):
            res = await self._python_sandbox.execute(code=code)
            return res.output if hasattr(res, "output") else res

        self.register(ToolDefinition(
            id="python.sandbox",
            name="Sandboxed Python Execution",
            description="Run verified, non-destructive Python scripts and generate Matplotlib visualizations.",
            category="compute",
            permission_tier=PermissionTier.EXECUTE,
            input_schema={"type": "object", "properties": {"code": {"type": "string"}}, "required": ["code"]},
            output_schema={"type": "object", "properties": {"stdout": {"type": "string"}, "images": {"type": "array"}}},
            requires_confirmation=False,
            handler=_exec_python
        ))

        # 4. User Files Tools
        async def _exec_files_list(user_id: str, limit: int = 20, **kwargs):
            return await list_user_files(user_id=user_id, limit=limit)

        self.register(ToolDefinition(
            id="files.list",
            name="List User Files",
            description="List recent assets and files created by or uploaded by the authenticated user.",
            category="files",
            permission_tier=PermissionTier.READ,
            input_schema={"type": "object", "properties": {"limit": {"type": "integer", "default": 20}}},
            output_schema={"type": "object", "properties": {"files": {"type": "array"}}},
            requires_confirmation=False,
            plugin_id="files",
            required_permission="files.read",
            handler=_exec_files_list
        ))

        async def _exec_files_search(user_id: str, query: str, **kwargs):
            return await search_user_files(user_id=user_id, query=query)

        self.register(ToolDefinition(
            id="files.search",
            name="Search User Files",
            description="Search user files by filename or keyword.",
            category="files",
            permission_tier=PermissionTier.READ,
            input_schema={"type": "object", "properties": {"query": {"type": "string"}}, "required": ["query"]},
            output_schema={"type": "object", "properties": {"matches": {"type": "array"}}},
            requires_confirmation=False,
            plugin_id="files",
            required_permission="files.read",
            handler=_exec_files_search
        ))

        async def _exec_files_read(user_id: str, file_id: str, **kwargs):
            return await read_user_file_metadata(user_id=user_id, file_id=file_id)

        self.register(ToolDefinition(
            id="files.read",
            name="Read File Details",
            description="Inspect metadata, URL, and generation prompt of a specific asset.",
            category="files",
            permission_tier=PermissionTier.READ,
            input_schema={"type": "object", "properties": {"file_id": {"type": "string"}}, "required": ["file_id"]},
            output_schema={"type": "object", "properties": {"id": {"type": "string"}, "name": {"type": "string"}}},
            requires_confirmation=False,
            plugin_id="files",
            required_permission="files.read",
            handler=_exec_files_read
        ))

        async def _exec_files_summarize(user_id: str, file_id: str, **kwargs):
            return await summarize_user_file(user_id=user_id, file_id=file_id)

        self.register(ToolDefinition(
            id="files.summarize",
            name="Summarize File",
            description="Generate a concise overview and summary of a user file.",
            category="files",
            permission_tier=PermissionTier.READ,
            input_schema={"type": "object", "properties": {"file_id": {"type": "string"}}, "required": ["file_id"]},
            output_schema={"type": "object", "properties": {"summary": {"type": "string"}}},
            requires_confirmation=False,
            plugin_id="files",
            required_permission="files.read",
            handler=_exec_files_summarize
        ))

        async def _exec_files_delete(user_id: str, file_id: str, **kwargs):
            return await delete_user_file(user_id=user_id, file_id=file_id)

        self.register(ToolDefinition(
            id="files.delete",
            name="Delete File",
            description="Permanently delete an asset belonging to the user. Requires explicit confirmation.",
            category="files",
            permission_tier=PermissionTier.DELETE,
            input_schema={"type": "object", "properties": {"file_id": {"type": "string"}}, "required": ["file_id"]},
            output_schema={"type": "object", "properties": {"success": {"type": "boolean"}}},
            requires_confirmation=True,
            plugin_id="files",
            required_permission="files.delete",
            handler=_exec_files_delete
        ))

        # 5. GitHub Tools
        for gh_tool_id, perm, tier, req_conf in [
            ("github.search_repositories", "github.read", PermissionTier.READ, False),
            ("github.get_repository", "github.read", PermissionTier.READ, False),
            ("github.list_issues", "github.read", PermissionTier.READ, False),
            ("github.get_issue", "github.read", PermissionTier.READ, False),
            ("github.create_issue", "github.write", PermissionTier.WRITE, True),
        ]:
            def make_gh_handler(tid=gh_tool_id):
                async def handler(user_id: Optional[str] = None, **params):
                    return await execute_github_tool(tool_name=tid, params=params, user_id=user_id)
                return handler

            self.register(ToolDefinition(
                id=gh_tool_id,
                name=gh_tool_id.replace("_", " ").title(),
                description=f"GitHub tool for {gh_tool_id.split('.')[-1]}",
                category="developer",
                permission_tier=tier,
                input_schema={"type": "object"},
                output_schema={"type": "object"},
                requires_confirmation=req_conf,
                plugin_id="github",
                required_permission=perm,
                handler=make_gh_handler(gh_tool_id)
            ))

        # 6. Google Drive Tools
        for drv_tool_id, perm, tier, req_conf in [
            ("drive.search", "drive.read", PermissionTier.READ, False),
            ("drive.get_file", "drive.read", PermissionTier.READ, False),
            ("drive.download_file", "drive.read", PermissionTier.READ, False),
        ]:
            def make_drv_handler(tid=drv_tool_id):
                async def handler(user_id: Optional[str] = None, **params):
                    return await execute_google_drive_tool(tool_name=tid, params=params, user_id=user_id)
                return handler

            self.register(ToolDefinition(
                id=drv_tool_id,
                name=drv_tool_id.replace("_", " ").title(),
                description=f"Google Drive tool for {drv_tool_id.split('.')[-1]}",
                category="storage",
                permission_tier=tier,
                input_schema={"type": "object"},
                output_schema={"type": "object"},
                requires_confirmation=req_conf,
                plugin_id="google_drive",
                required_permission=perm,
                handler=make_drv_handler(drv_tool_id)
            ))

        # 7. Google Calendar Tools
        for cal_tool_id, perm, tier, req_conf in [
            ("calendar.list_events", "calendar.read", PermissionTier.READ, False),
            ("calendar.get_event", "calendar.read", PermissionTier.READ, False),
            ("calendar.create_event", "calendar.write", PermissionTier.WRITE, True),
            ("calendar.update_event", "calendar.write", PermissionTier.WRITE, True),
            ("calendar.delete_event", "calendar.write", PermissionTier.DELETE, True),
        ]:
            def make_cal_handler(tid=cal_tool_id):
                async def handler(user_id: Optional[str] = None, **params):
                    return await execute_google_calendar_tool(tool_name=tid, params=params, user_id=user_id)
                return handler

            self.register(ToolDefinition(
                id=cal_tool_id,
                name=cal_tool_id.replace("_", " ").title(),
                description=f"Google Calendar tool for {cal_tool_id.split('.')[-1]}",
                category="productivity",
                permission_tier=tier,
                input_schema={"type": "object"},
                output_schema={"type": "object"},
                requires_confirmation=req_conf,
                plugin_id="google_calendar",
                required_permission=perm,
                handler=make_cal_handler(cal_tool_id)
            ))

        # 8. Slack Tools
        for slk_tool_id, perm, tier, req_conf in [
            ("slack.list_channels", "slack.read", PermissionTier.READ, False),
            ("slack.search_messages", "slack.read", PermissionTier.READ, False),
            ("slack.get_messages", "slack.read", PermissionTier.READ, False),
            ("slack.send_message", "slack.send", PermissionTier.PUBLISH, True),
        ]:
            def make_slk_handler(tid=slk_tool_id):
                async def handler(user_id: Optional[str] = None, **params):
                    return await execute_slack_tool(tool_name=tid, params=params, user_id=user_id)
                return handler

            self.register(ToolDefinition(
                id=slk_tool_id,
                name=slk_tool_id.replace("_", " ").title(),
                description=f"Slack tool for {slk_tool_id.split('.')[-1]}",
                category="communication",
                permission_tier=tier,
                input_schema={"type": "object"},
                output_schema={"type": "object"},
                requires_confirmation=req_conf,
                plugin_id="slack",
                required_permission=perm,
                handler=make_slk_handler(slk_tool_id)
            ))

        # 9. Notion Tools
        for ntn_tool_id, perm, tier, req_conf in [
            ("notion.search", "notion.read", PermissionTier.READ, False),
            ("notion.get_page", "notion.read", PermissionTier.READ, False),
            ("notion.create_page", "notion.write", PermissionTier.WRITE, True),
        ]:
            def make_ntn_handler(tid=ntn_tool_id):
                async def handler(user_id: Optional[str] = None, **params):
                    return await execute_notion_tool(tool_name=tid, params=params, user_id=user_id)
                return handler

            self.register(ToolDefinition(
                id=ntn_tool_id,
                name=ntn_tool_id.replace("_", " ").title(),
                description=f"Notion tool for {ntn_tool_id.split('.')[-1]}",
                category="productivity",
                permission_tier=tier,
                input_schema={"type": "object"},
                output_schema={"type": "object"},
                requires_confirmation=req_conf,
                plugin_id="notion",
                required_permission=perm,
                handler=make_ntn_handler(ntn_tool_id)
            ))

        # 10. 3D Creative Tools
        for t in THREE_D_TOOLS:
            self.register(t)

        # 11. AI Image Studio Generation Tool
        async def _exec_image_generate(prompt: str, style: str = "Photorealistic", aspect_ratio: str = "1:1", **kwargs):
            from app.services.image.router import image_router
            from app.services.image.base import ImageGenerationTask
            from app.services.storage.factory import get_storage_provider
            import datetime

            task = ImageGenerationTask(
                prompt=prompt,
                style=style,
                aspect_ratio=aspect_ratio,
                num_images=1,
                model="gemini:imagen-3.0"
            )
            imgs = await image_router.generate(task)
            if not imgs:
                return {"error": "Failed to synthesize image."}

            storage = get_storage_provider()
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"chat_img_{timestamp}.png"
            storage_key = f"projects/chat/assets/{filename}"
            import io
            download_url = await storage.upload(
                file_obj=io.BytesIO(imgs[0].image_bytes),
                storage_key=storage_key,
                content_type="image/png"
            )
            return {
                "image_url": download_url,
                "provider": imgs[0].provider,
                "model": imgs[0].model,
                "prompt": prompt,
                "style": style
            }

        self.register(ToolDefinition(
            id="image.generate",
            name="AI Image Generation",
            description="Generate photorealistic or stylized AI imagery using Flux, DALL-E 3, or Gemini Imagen.",
            category="creative",
            permission_tier=PermissionTier.EXECUTE,
            input_schema={
                "type": "object",
                "properties": {
                    "prompt": {"type": "string", "description": "The visual description of what to generate"},
                    "style": {"type": "string", "description": "Artistic style (Photorealistic, Cinematic, Anime, 3D Render, etc.)"},
                    "aspect_ratio": {"type": "string", "description": "Image aspect ratio like 1:1, 16:9, 9:16"}
                },
                "required": ["prompt"]
            },
            output_schema={
                "type": "object",
                "properties": {
                    "image_url": {"type": "string"},
                    "provider": {"type": "string"},
                    "model": {"type": "string"}
                }
            },
            requires_confirmation=False,
            handler=_exec_image_generate
        ))


_global_tool_registry = ToolRegistry()


def get_tool_registry() -> ToolRegistry:
    return _global_tool_registry
