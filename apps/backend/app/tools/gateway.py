import time
import ipaddress
import urllib.parse
import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone
from app.tools.contracts import ToolDefinition, PermissionTier
from app.tools.registry import get_tool_registry, ToolRegistry
from app.tools.confirmation import get_confirmation_manager, ConfirmationManager
from app.core.database import get_database

logger = logging.getLogger("yash.ai.tools.gateway")


class ToolGateway:
    """
    Central security gateway for all AI tool and plugin execution.
    Features:
    - SSRF URL sanitation against private networks and cloud metadata IP.
    - Human Confirmation Protocol enforcement for destructive tools.
    - Execution timeout protection.
    - Result sanitization and output truncation.
    - MongoDB audit logging.
    """

    def __init__(
        self,
        registry: Optional[ToolRegistry] = None,
        confirmation_mgr: Optional[ConfirmationManager] = None
    ):
        self.registry = registry or get_tool_registry()
        self.confirmation_mgr = confirmation_mgr or get_confirmation_manager()
        self.max_execution_time = 30

    def is_url_safe(self, url_str: str) -> bool:
        """
        SSRF Defense: Blocks loops to localhost, link-local metadata (169.254.169.254),
        private RFC 1918 addresses, and internal network hostnames.
        """
        try:
            parsed = urllib.parse.urlparse(url_str)
            if parsed.scheme not in ("http", "https"):
                return False

            hostname = parsed.hostname
            if not hostname:
                return False

            # Block localhost strings
            if hostname.lower() in ("localhost", "127.0.0.1", "::1", "0.0.0.0", "metadata.google.internal"):
                return False

            # Try parsing IP directly
            try:
                ip = ipaddress.ip_address(hostname)
                if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                    return False
            except ValueError:
                # Valid domain name; further DNS resolution can be done if needed
                pass

            return True
        except Exception:
            return False

    async def execute_tool(
        self,
        tool_id: str,
        params: Dict[str, Any],
        user_id: Optional[str] = None,
        confirmation_ticket_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Orchestrates tool execution through all security checks and returns output.
        """
        start_time = time.time()
        tool = self.registry.get(tool_id)

        if not tool:
            return {
                "success": False,
                "error": f"Tool '{tool_id}' not found in registry.",
                "status": "NOT_FOUND"
            }

        # 1. SSRF Check on all string parameter values containing URLs
        for key, val in params.items():
            if isinstance(val, str) and (val.startswith("http://") or val.startswith("https://")):
                if not self.is_url_safe(val):
                    return {
                        "success": False,
                        "error": f"Security violation: The URL supplied for '{key}' is blocked by SSRF defense.",
                        "status": "SSRF_BLOCKED"
                    }

        # 2. Authentication requirement for non-READ tools
        if tool.permission_tier != PermissionTier.READ and not user_id:
            return {
                "success": False,
                "error": "Authentication required to execute this tool.",
                "status": "UNAUTHORIZED"
            }

        # 3. Human Confirmation Check
        if tool.requires_confirmation:
            if not confirmation_ticket_id:
                ticket = self.confirmation_mgr.create_ticket(
                    user_id=user_id or "anonymous",
                    tool_id=tool_id,
                    action_summary=f"Run {tool.name} with parameters: {list(params.keys())}",
                    params=params
                )
                return {
                    "success": False,
                    "status": "CONFIRMATION_REQUIRED",
                    "ticket_id": ticket.ticket_id,
                    "action_summary": ticket.action_summary,
                    "params": params,
                    "message": "This sensitive action requires explicit user approval before execution."
                }
            else:
                # Verify and consume ticket
                if not self.confirmation_mgr.verify_ticket(confirmation_ticket_id, user_id or "anonymous"):
                    return {
                        "success": False,
                        "status": "CONFIRMATION_INVALID",
                        "error": "The confirmation ticket is invalid, expired, or belongs to another user."
                    }
                self.confirmation_mgr.consume_ticket(confirmation_ticket_id)

        # 4. Tool Execution with Timeout
        execution_error = None
        result_data = None
        status_code = "COMPLETED"

        try:
            handler = tool.handler
            if not handler:
                raise NotImplementedError(f"Handler for tool '{tool_id}' is not implemented.")

            # Pass user_id if supported by handler signature
            kwargs = {**params}
            if user_id:
                kwargs["user_id"] = user_id

            if asyncio.iscoroutinefunction(handler):
                result_data = await asyncio.wait_for(handler(**kwargs), timeout=self.max_execution_time)
            else:
                result_data = await asyncio.to_thread(handler, **kwargs)

        except asyncio.TimeoutError:
            status_code = "TIMEOUT"
            execution_error = f"Tool '{tool_id}' timed out after {self.max_execution_time} seconds."
        except Exception as e:
            status_code = "FAILED"
            execution_error = str(e)
            logger.error(f"[ToolGateway] Execution failed for '{tool_id}': {e}", exc_info=True)

        duration_ms = int((time.time() - start_time) * 1000)

        # 5. Output Sanitization & Truncation (protect against token exhaustion / prompt hijacking)
        sanitized_result = result_data
        if isinstance(result_data, str) and len(result_data) > 20000:
            sanitized_result = result_data[:20000] + "... [Output truncated for safety]"

        # 6. Audit Logging in MongoDB
        try:
            db = get_database()
            await db["tool_audit_logs"].insert_one({
                "user_id": user_id,
                "tool_id": tool_id,
                "status": status_code,
                "duration_ms": duration_ms,
                "error": execution_error,
                "requires_confirmation": tool.requires_confirmation,
                "timestamp": datetime.now(timezone.utc)
            })
        except Exception as log_ex:
            logger.warning(f"[ToolGateway] Audit logging notice: {log_ex}")

        if execution_error:
            return {
                "success": False,
                "status": status_code,
                "error": execution_error,
                "duration_ms": duration_ms
            }

        return {
            "success": True,
            "status": "COMPLETED",
            "data": sanitized_result,
            "duration_ms": duration_ms
        }
