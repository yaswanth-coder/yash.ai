from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel, Field
import uuid


class ToolParameterSchema(BaseModel):
    type: str = "object"
    properties: Dict[str, Any] = Field(default_factory=dict)
    required: List[str] = Field(default_factory=list)


class PluginToolMetadata(BaseModel):
    id: str  # e.g. "github.search_repositories"
    name: str
    description: str
    permission: str  # e.g. "github.read"
    permission_tier: str = "READ"  # READ, WRITE, DELETE, PUBLISH, EXECUTE
    requires_confirmation: bool = False
    input_schema: Dict[str, Any] = Field(default_factory=dict)
    output_schema: Dict[str, Any] = Field(default_factory=dict)


class PluginManifest(BaseModel):
    id: str  # e.g. "github", "google_drive"
    name: str
    description: str
    version: str = "1.0.0"
    author: str = "Yash.AI"
    icon: str = "Blocks"
    category: str = "Developer Tools"
    permissions: List[str] = Field(default_factory=list)
    auth_type: str = "none"  # "none", "api_key", "oauth2"
    tools: List[PluginToolMetadata] = Field(default_factory=list)
    config_schema: Dict[str, Any] = Field(default_factory=dict)
    documentation_url: Optional[str] = None
    privacy_policy_url: Optional[str] = None
    is_first_party: bool = True


class PluginInstallation(BaseModel):
    user_id: str
    plugin_id: str
    enabled: bool = True
    granted_permissions: List[str] = Field(default_factory=list)
    configuration: Dict[str, Any] = Field(default_factory=dict)
    installed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PluginConnection(BaseModel):
    user_id: str
    plugin_id: str
    auth_type: str  # "api_key", "oauth2"
    encrypted_credentials: str  # Fernet encrypted ciphertext
    status: str = "CONNECTED"  # "CONNECTED", "EXPIRED", "AUTH_REQUIRED"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ToolAuditLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None
    plugin_id: str
    tool_id: str
    duration_ms: int
    status: str  # "COMPLETED", "FAILED", "CONFIRMATION_REQUIRED", "CONFIRMATION_INVALID", "TIMEOUT", "SSRF_BLOCKED", "PERMISSION_DENIED"
    error: Optional[str] = None
    requires_confirmation: bool = False
    safe_params: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ConfirmationTicketModel(BaseModel):
    ticket_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    tool_id: str
    action_summary: str
    params: Dict[str, Any] = Field(default_factory=dict)
    status: str = "PENDING"  # "PENDING", "APPROVED", "REJECTED", "CONSUMED", "EXPIRED"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
