import time
import inspect
import ipaddress
import urllib.parse
import asyncio
import logging
from typing import Dict, Any, Optional, List
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
    - User plugin authorization & granular permission enforcement.
    - SSRF URL sanitation against private networks and cloud metadata IPs.
    - Sliding window rate limiting.
    - Human Confirmation Protocol enforcement for sensitive/write operations.
    - Execution timeout protection.
    - Result sanitization and output truncation.
    - Secure MongoDB audit logging with sensitive credential redaction.
    """

    def __init__(
        self,
        registry: Optional[ToolRegistry] = None,
        confirmation_mgr: Optional[ConfirmationManager] = None
    ):
        self.registry = registry or get_tool_registry()
        self.confirmation_mgr = confirmation_mgr or get_confirmation_manager()
        self.max_execution_time = 30
        self.rate_limit_per_minute = 60
        self._user_rate_records: Dict[str, List[float]] = {}

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

            # Block localhost and cloud metadata
            blocked_hosts = ("localhost", "127.0.0.1", "::1", "0.0.0.0", "metadata.google.internal", "169.254.169.254")
            if hostname.lower() in blocked_hosts or hostname.lower().endswith(".internal") or hostname.lower().endswith(".local"):
                return False

            # Try parsing IP directly
            try:
                ip = ipaddress.ip_address(hostname)
                if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
                    return False
            except ValueError:
                pass

            return True
        except Exception:
            return False

    def _check_rate_limit(self, identifier: str) -> bool:
        now = time.time()
        window_start = now - 60.0
        timestamps = self._user_rate_records.get(identifier, [])
        # Filter older than 60s
        recent = [t for t in timestamps if t > window_start]
        if len(recent) >= self.rate_limit_per_minute:
            self._user_rate_records[identifier] = recent
            return False
        recent.append(now)
        self._user_rate_records[identifier] = recent
        return True

    def _sanitize_params_for_audit(self, params: Dict[str, Any]) -> Dict[str, Any]:
        safe = {}
        sensitive_keys = {"token", "key", "password", "secret", "api_key", "credentials", "auth"}
        for k, v in params.items():
            if any(s in k.lower() for s in sensitive_keys):
                safe[k] = "•••••••• [REDACTED]"
            elif isinstance(v, str) and len(v) > 500:
                safe[k] = v[:500] + "... [TRUNCATED]"
            else:
                safe[k] = v
        return safe

    async def execute_tool(
        self,
        tool_id: str,
        params: Dict[str, Any],
        user_id: Optional[str] = None,
        confirmation_ticket_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        start_time = time.time()
        tool = self.registry.get(tool_id)

        if not tool:
            return {
                "success": False,
                "error": f"Tool '{tool_id}' not found in registry.",
                "status": "NOT_FOUND"
            }

        rate_key = user_id or "anonymous"
        if not self._check_rate_limit(rate_key):
            return {
                "success": False,
                "error": "Rate limit exceeded (60 requests/minute). Please slow down.",
                "status": "PLUGIN_RATE_LIMITED"
            }

        # 1. SSRF Check on all parameter URLs
        for key, val in params.items():
            if isinstance(val, str) and (val.startswith("http://") or val.startswith("https://")):
                if not self.is_url_safe(val):
                    return {
                        "success": False,
                        "error": f"Security violation: The URL supplied for '{key}' is blocked by SSRF defense.",
                        "status": "SSRF_BLOCKED"
                    }

        # 2. Authentication check for non-READ tools
        if tool.permission_tier != PermissionTier.READ and not user_id:
            return {
                "success": False,
                "error": "Authentication required to execute this tool.",
                "status": "UNAUTHORIZED"
            }

        # 3. Plugin Installation & Permission Verification
        if tool.plugin_id and tool.plugin_id not in ("web_search", "files") and user_id:
            try:
                db = get_database()
                inst = await db["plugin_installations"].find_one({"user_id": user_id, "plugin_id": tool.plugin_id})
                if not inst or not inst.get("enabled", True):
                    return {
                        "success": False,
                        "error": f"Plugin '{tool.plugin_id}' is not installed or is disabled for this account.",
                        "status": "PLUGIN_DISABLED"
                    }
                if tool.required_permission:
                    granted = inst.get("granted_permissions", [])
                    if tool.required_permission not in granted:
                        return {
                            "success": False,
                            "error": f"Permission '{tool.required_permission}' has not been granted for plugin '{tool.plugin_id}'.",
                            "status": "PERMISSION_DENIED"
                        }
            except Exception as ex:
                logger.warning(f"[ToolGateway] Permission lookup notice: {ex}")

        # 4. Human Confirmation Check
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

        # 5. Tool Execution with Timeout
        execution_error = None
        result_data = None
        status_code = "COMPLETED"

        try:
            handler = tool.handler
            if not handler:
                raise NotImplementedError(f"Handler for tool '{tool_id}' is not implemented.")

            kwargs = {**params}
            if user_id:
                kwargs["user_id"] = user_id

            if inspect.iscoroutinefunction(handler):
                result_data = await asyncio.wait_for(handler(**kwargs), timeout=self.max_execution_time)
            else:
                result_data = await asyncio.to_thread(handler, **kwargs)

            # Check if result dictionary contains a specialized status (e.g. PLUGIN_AUTH_REQUIRED)
            if isinstance(result_data, dict) and "status" in result_data and result_data["status"] != "COMPLETED":
                status_code = result_data["status"]
                if "error" in result_data:
                    execution_error = result_data["error"]

        except asyncio.TimeoutError:
            status_code = "TIMEOUT"
            execution_error = f"Tool '{tool_id}' timed out after {self.max_execution_time} seconds."
        except Exception as e:
            status_code = "FAILED"
            execution_error = str(e)
            logger.error(f"[ToolGateway] Execution failed for '{tool_id}': {e}", exc_info=True)

        duration_ms = int((time.time() - start_time) * 1000)

        # 6. Output Sanitization & Truncation (protect against token exhaustion / prompt injection)
        sanitized_result = result_data
        if isinstance(result_data, str) and len(result_data) > 20000:
            sanitized_result = result_data[:20000] + "... [Output truncated for safety]"

        # 7. Audit Logging in MongoDB
        try:
            db = get_database()
            await db["tool_audit_logs"].insert_one({
                "user_id": user_id,
                "plugin_id": tool.plugin_id or "core",
                "tool_id": tool_id,
                "status": status_code,
                "duration_ms": duration_ms,
                "error": execution_error,
                "requires_confirmation": tool.requires_confirmation,
                "safe_params": self._sanitize_params_for_audit(params),
                "timestamp": datetime.now(timezone.utc)
            })
        except Exception as log_ex:
            logger.warning(f"[ToolGateway] Audit logging notice: {log_ex}")

        if execution_error or status_code not in ("COMPLETED",):
            return {
                "success": False,
                "status": status_code,
                "error": execution_error or "Tool execution did not complete.",
                "duration_ms": duration_ms,
                "data": sanitized_result
            }

        return {
            "success": True,
            "status": "COMPLETED",
            "data": sanitized_result,
            "duration_ms": duration_ms
        }
