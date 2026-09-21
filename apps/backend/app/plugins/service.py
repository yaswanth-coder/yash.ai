import logging
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.core.database import get_database
from app.models.plugin_models import PluginManifest, PluginInstallation, PluginConnection
from app.plugins.manifests import FIRST_PARTY_MANIFESTS, MANIFEST_BY_ID
from app.services.plugin_crypto import get_plugin_crypto

logger = logging.getLogger("yash.ai.plugins.service")


class PluginManagerService:
    """
    Central service for managing the Yash.AI Plugin Registry, user installations,
    granted permissions, and encrypted connections.
    """

    def __init__(self):
        self._crypto = get_plugin_crypto()

    def get_manifest(self, plugin_id: str) -> Optional[PluginManifest]:
        return MANIFEST_BY_ID.get(plugin_id)

    async def list_available_plugins(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Lists all marketplace plugins with user-specific installation, enabled,
        and connection statuses.
        """
        installations_map: Dict[str, Dict[str, Any]] = {}
        connections_map: Dict[str, Dict[str, Any]] = {}

        if user_id:
            try:
                db = get_database()
                inst_cursor = db["plugin_installations"].find({"user_id": user_id})
                async for inst in inst_cursor:
                    installations_map[inst["plugin_id"]] = inst

                conn_cursor = db["plugin_connections"].find({"user_id": user_id})
                async for conn in conn_cursor:
                    connections_map[conn["plugin_id"]] = conn
            except Exception as e:
                logger.warning(f"[PluginManager] DB read error for user '{user_id}': {e}")

        results = []
        for manifest in FIRST_PARTY_MANIFESTS:
            inst = installations_map.get(manifest.id)
            conn = connections_map.get(manifest.id)

            # Default: web_search and files are pre-enabled first-party tools
            is_default_installed = manifest.id in ("web_search", "files")
            is_installed = bool(inst) or is_default_installed
            is_enabled = inst.get("enabled", True) if inst else is_default_installed

            granted_perms = inst.get("granted_permissions", manifest.permissions) if inst else (
                manifest.permissions if is_default_installed else []
            )

            # Health / Connection status
            if manifest.auth_type == "none":
                status = "CONNECTED"
            elif conn and conn.get("status") == "CONNECTED":
                status = "CONNECTED"
            elif is_installed:
                status = "AUTH_REQUIRED"
            else:
                status = "AVAILABLE"

            results.append({
                "id": manifest.id,
                "name": manifest.name,
                "description": manifest.description,
                "version": manifest.version,
                "author": manifest.author,
                "icon": manifest.icon,
                "category": manifest.category,
                "permissions": manifest.permissions,
                "granted_permissions": granted_perms,
                "auth_type": manifest.auth_type,
                "config_schema": manifest.config_schema,
                "documentation_url": manifest.documentation_url,
                "is_first_party": manifest.is_first_party,
                "is_installed": is_installed,
                "is_enabled": is_enabled,
                "status": status,
                "tools_count": len(manifest.tools),
            })

        return results

    async def get_plugin_details(self, plugin_id: str, user_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        manifest = self.get_manifest(plugin_id)
        if not manifest:
            return None

        is_installed = False
        is_enabled = False
        granted_perms = []
        conn_status = "AVAILABLE" if manifest.auth_type != "none" else "CONNECTED"

        if user_id:
            try:
                db = get_database()
                inst = await db["plugin_installations"].find_one({"user_id": user_id, "plugin_id": plugin_id})
                if inst:
                    is_installed = True
                    is_enabled = inst.get("enabled", True)
                    granted_perms = inst.get("granted_permissions", [])

                conn = await db["plugin_connections"].find_one({"user_id": user_id, "plugin_id": plugin_id})
                if conn:
                    conn_status = conn.get("status", "AUTH_REQUIRED")
            except Exception as e:
                logger.warning(f"[PluginManager] DB read error: {e}")

        if not is_installed and manifest.id in ("web_search", "files"):
            is_installed = True
            is_enabled = True
            granted_perms = manifest.permissions

        manifest_data = manifest.model_dump() if hasattr(manifest, "model_dump") else manifest.dict()
        return {
            **manifest_data,
            "is_installed": is_installed,
            "is_enabled": is_enabled,
            "granted_permissions": granted_perms,
            "status": conn_status,
        }

    async def install_plugin(
        self,
        user_id: str,
        plugin_id: str,
        granted_permissions: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        manifest = self.get_manifest(plugin_id)
        if not manifest:
            raise ValueError(f"Plugin '{plugin_id}' is not a recognized Yash.AI plugin.")

        permissions_to_grant = granted_permissions if granted_permissions is not None else manifest.permissions
        db = get_database()

        doc = {
            "user_id": user_id,
            "plugin_id": plugin_id,
            "enabled": True,
            "granted_permissions": permissions_to_grant,
            "configuration": {},
            "installed_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }

        await db["plugin_installations"].update_one(
            {"user_id": user_id, "plugin_id": plugin_id},
            {"$set": doc},
            upsert=True
        )

        logger.info(f"[PluginManager] User '{user_id}' installed plugin '{plugin_id}'")
        return {"success": True, "plugin_id": plugin_id, "enabled": True}

    async def uninstall_plugin(self, user_id: str, plugin_id: str) -> bool:
        db = get_database()
        await db["plugin_installations"].delete_one({"user_id": user_id, "plugin_id": plugin_id})
        # Also clean up credentials safely
        await db["plugin_connections"].delete_one({"user_id": user_id, "plugin_id": plugin_id})
        logger.info(f"[PluginManager] User '{user_id}' uninstalled plugin '{plugin_id}'")
        return True

    async def toggle_plugin(self, user_id: str, plugin_id: str, enabled: bool) -> bool:
        db = get_database()
        res = await db["plugin_installations"].update_one(
            {"user_id": user_id, "plugin_id": plugin_id},
            {"$set": {"enabled": enabled, "updated_at": datetime.now(timezone.utc)}}
        )
        if res.matched_count == 0:
            # Install if not explicitly installed
            await self.install_plugin(user_id, plugin_id)
            await db["plugin_installations"].update_one(
                {"user_id": user_id, "plugin_id": plugin_id},
                {"$set": {"enabled": enabled}}
            )
        return True

    async def configure_plugin(
        self,
        user_id: str,
        plugin_id: str,
        configuration: Optional[Dict[str, Any]] = None,
        credentials: Optional[Dict[str, Any]] = None
    ) -> bool:
        manifest = self.get_manifest(plugin_id)
        if not manifest:
            raise ValueError(f"Plugin '{plugin_id}' not found.")

        db = get_database()

        # 1. Update non-secret configuration
        if configuration:
            await db["plugin_installations"].update_one(
                {"user_id": user_id, "plugin_id": plugin_id},
                {"$set": {"configuration": configuration, "updated_at": datetime.now(timezone.utc)}},
                upsert=True
            )

        # 2. Encrypt & store secrets safely
        if credentials:
            encrypted_payload = self._crypto.encrypt_credentials(credentials)
            await db["plugin_connections"].update_one(
                {"user_id": user_id, "plugin_id": plugin_id},
                {"$set": {
                    "user_id": user_id,
                    "plugin_id": plugin_id,
                    "auth_type": manifest.auth_type,
                    "encrypted_credentials": encrypted_payload,
                    "status": "CONNECTED",
                    "updated_at": datetime.now(timezone.utc)
                }},
                upsert=True
            )

        logger.info(f"[PluginManager] Configured credentials for user '{user_id}', plugin '{plugin_id}'")
        return True

    async def get_plugin_credentials(self, user_id: str, plugin_id: str) -> Optional[Dict[str, Any]]:
        """
        Securely retrieves and decrypts stored credentials for backend tool execution.
        NEVER sends this data to the frontend or LLM.
        """
        try:
            db = get_database()
            conn = await db["plugin_connections"].find_one({"user_id": user_id, "plugin_id": plugin_id})
            if not conn or not conn.get("encrypted_credentials"):
                return None
            return self._crypto.decrypt_credentials(conn["encrypted_credentials"])
        except Exception as e:
            logger.error(f"[PluginManager] Error fetching credentials for '{plugin_id}': {e}")
            return None

    async def get_active_tools_for_user(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Returns list of all active tools available to the given user, based on their
        installed & enabled plugins and granted permissions.
        """
        installed_plugins = await self.list_available_plugins(user_id)
        active_tools = []

        for p_info in installed_plugins:
            if not p_info["is_enabled"]:
                continue

            manifest = self.get_manifest(p_info["id"])
            if not manifest:
                continue

            granted = set(p_info.get("granted_permissions", []))
            for tool in manifest.tools:
                if tool.permission in granted:
                    active_tools.append({
                        "id": tool.id,
                        "plugin_id": manifest.id,
                        "plugin_name": manifest.name,
                        "name": tool.name,
                        "description": tool.description,
                        "permission": tool.permission,
                        "permission_tier": tool.permission_tier,
                        "requires_confirmation": tool.requires_confirmation,
                        "input_schema": tool.input_schema,
                        "output_schema": tool.output_schema,
                    })

        return active_tools


_plugin_manager = PluginManagerService()


def get_plugin_manager() -> PluginManagerService:
    return _plugin_manager
