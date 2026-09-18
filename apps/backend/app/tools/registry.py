import inspect
import logging
from typing import Dict, Any, List, Optional
from app.tools.contracts import ToolDefinition, PermissionTier
from app.tools.web_search import WebSearchTool
from app.tools.calculator import CalculatorTool
from app.tools.python_sandbox import PythonSandboxTool
from app.tools.file_tools import list_user_files, read_user_file_metadata, delete_user_file
from app.tools.three_d_tools import THREE_D_TOOLS

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
        # Return all registered tools
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

        # 4. User Files List
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
            handler=_exec_files_list
        ))

        # 5. User File Read Metadata
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
            handler=_exec_files_read
        ))

        # 6. User File Delete (Requires Confirmation)
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
            handler=_exec_files_delete
        ))

        # 7. 3D Creative Tools
        for t in THREE_D_TOOLS:
            self.register(t)

        # 8. AI Image Studio Generation Tool
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
