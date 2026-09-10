from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, Any, List, Optional, Callable


class PermissionTier(str, Enum):
    READ = "READ"          # Safe reads: search, list, fetch stats
    EXECUTE = "EXECUTE"    # Code sandbox, math, image gen
    WRITE = "WRITE"        # Create issues, update docs, post events
    DELETE = "DELETE"      # Delete assets, files, cancel projects
    PUBLISH = "PUBLISH"    # Send emails, publish video, deploy


@dataclass
class ToolDefinition:
    id: str                                  # e.g. "web.search", "files.delete"
    name: str                                # User-facing title
    description: str                         # LLM & UI capability summary
    category: str                            # "search", "files", "compute", "creative"
    permission_tier: PermissionTier          # Tier required
    input_schema: Dict[str, Any]             # JSON schema for input arguments
    output_schema: Dict[str, Any]            # JSON schema for return value
    requires_confirmation: bool = False      # Whether human signoff is mandatory
    timeout_seconds: int = 30
    is_first_party: bool = True
    handler: Optional[Callable] = None       # Async or sync callable
