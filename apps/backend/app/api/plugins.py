from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.core.deps import get_current_user, get_optional_user
from app.plugins.service import get_plugin_manager, PluginManagerService
from app.core.database import get_database

router = APIRouter(
    prefix="/plugins",
    tags=["Plugins & Marketplace"]
)


class InstallPluginRequest(BaseModel):
    granted_permissions: Optional[List[str]] = None


class ConfigurePluginRequest(BaseModel):
    configuration: Optional[Dict[str, Any]] = None
    credentials: Optional[Dict[str, Any]] = None  # API keys, tokens to encrypt


@router.get("")
@router.get("/")
async def list_plugins(
    current_user: Optional[dict] = Depends(get_optional_user),
    plugin_mgr: PluginManagerService = Depends(get_plugin_manager)
):
    """
    List all available plugins in the marketplace, augmented with user's
    installation and connection status.
    """
    user_id = current_user["_id"] if current_user else None
    return await plugin_mgr.list_available_plugins(user_id=user_id)


@router.get("/audit/logs")
async def get_plugin_audit_logs(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """
    View user's personal audit logs for tool and plugin executions.
    """
    user_id = current_user["_id"]
    db = get_database()
    logs = await (
        db["tool_audit_logs"]
        .find({"user_id": user_id})
        .sort("timestamp", -1)
        .limit(min(limit, 100))
        .to_list(None)
    )
    for log in logs:
        if "_id" in log:
            log["_id"] = str(log["_id"])
        if "timestamp" in log:
            log["timestamp"] = str(log["timestamp"])
    return logs


@router.get("/{plugin_id}")
async def get_plugin(
    plugin_id: str,
    current_user: Optional[dict] = Depends(get_optional_user),
    plugin_mgr: PluginManagerService = Depends(get_plugin_manager)
):
    user_id = current_user["_id"] if current_user else None
    details = await plugin_mgr.get_plugin_details(plugin_id=plugin_id, user_id=user_id)
    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plugin '{plugin_id}' not found in registry."
        )
    return details


@router.get("/{plugin_id}/tools")
async def get_plugin_tools(
    plugin_id: str,
    plugin_mgr: PluginManagerService = Depends(get_plugin_manager)
):
    manifest = plugin_mgr.get_manifest(plugin_id)
    if not manifest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plugin '{plugin_id}' not found."
        )
    return manifest.tools


@router.post("/{plugin_id}/install")
async def install_plugin(
    plugin_id: str,
    body: Optional[InstallPluginRequest] = None,
    current_user: dict = Depends(get_current_user),
    plugin_mgr: PluginManagerService = Depends(get_plugin_manager)
):
    user_id = current_user["_id"]
    granted_perms = body.granted_permissions if body else None
    try:
        return await plugin_mgr.install_plugin(
            user_id=user_id,
            plugin_id=plugin_id,
            granted_permissions=granted_perms
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{plugin_id}/enable")
async def enable_plugin(
    plugin_id: str,
    current_user: dict = Depends(get_current_user),
    plugin_mgr: PluginManagerService = Depends(get_plugin_manager)
):
    user_id = current_user["_id"]
    await plugin_mgr.toggle_plugin(user_id=user_id, plugin_id=plugin_id, enabled=True)
    return {"success": True, "plugin_id": plugin_id, "enabled": True}


@router.post("/{plugin_id}/disable")
async def disable_plugin(
    plugin_id: str,
    current_user: dict = Depends(get_current_user),
    plugin_mgr: PluginManagerService = Depends(get_plugin_manager)
):
    user_id = current_user["_id"]
    await plugin_mgr.toggle_plugin(user_id=user_id, plugin_id=plugin_id, enabled=False)
    return {"success": True, "plugin_id": plugin_id, "enabled": False}


@router.post("/{plugin_id}/configure")
async def configure_plugin(
    plugin_id: str,
    body: ConfigurePluginRequest,
    current_user: dict = Depends(get_current_user),
    plugin_mgr: PluginManagerService = Depends(get_plugin_manager)
):
    user_id = current_user["_id"]
    try:
        await plugin_mgr.configure_plugin(
            user_id=user_id,
            plugin_id=plugin_id,
            configuration=body.configuration,
            credentials=body.credentials
        )
        return {"success": True, "message": f"Plugin '{plugin_id}' configured successfully."}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{plugin_id}")
async def uninstall_plugin(
    plugin_id: str,
    current_user: dict = Depends(get_current_user),
    plugin_mgr: PluginManagerService = Depends(get_plugin_manager)
):
    user_id = current_user["_id"]
    await plugin_mgr.uninstall_plugin(user_id=user_id, plugin_id=plugin_id)
    return {"success": True, "plugin_id": plugin_id, "message": "Plugin uninstalled and credentials purged."}
