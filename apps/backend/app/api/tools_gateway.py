from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from app.core.deps import get_optional_user, get_current_user
from app.tools.registry import get_tool_registry, ToolRegistry
from app.tools.gateway import ToolGateway
from app.tools.confirmation import get_confirmation_manager, ConfirmationManager

router = APIRouter(
    prefix="/tools",
    tags=["Tools & Gateway"]
)

_gateway = ToolGateway()


class ToolInfoResponse(BaseModel):
    id: str
    name: str
    description: str
    category: str
    permission_tier: str
    requires_confirmation: bool
    input_schema: Dict[str, Any]


class ToolExecutionRequest(BaseModel):
    tool_id: str
    params: Dict[str, Any] = Field(default_factory=dict)
    confirmation_ticket_id: Optional[str] = None


class ToolConfirmationRequest(BaseModel):
    ticket_id: str
    approved: bool


@router.get("", response_model=List[ToolInfoResponse])
@router.get("/", response_model=List[ToolInfoResponse])
def list_available_tools(
    registry: ToolRegistry = Depends(get_tool_registry)
):
    """
    Returns list of active tools available in the Tool Registry.
    """
    tools = registry.list_tools()
    return [
        ToolInfoResponse(
            id=t.id,
            name=t.name,
            description=t.description,
            category=t.category,
            permission_tier=t.permission_tier.value,
            requires_confirmation=t.requires_confirmation,
            input_schema=t.input_schema
        )
        for t in tools
    ]


@router.post("/execute")
async def execute_tool(
    body: ToolExecutionRequest,
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    Execute a tool via the Tool Execution Gateway.
    Handles permissions, SSRF verification, timeouts, and human confirmation checks.
    """
    user_id = current_user["_id"] if current_user else None
    result = await _gateway.execute_tool(
        tool_id=body.tool_id,
        params=body.params,
        user_id=user_id,
        confirmation_ticket_id=body.confirmation_ticket_id
    )

    if result.get("status") == "CONFIRMATION_REQUIRED":
        return result

    if not result.get("success", False):
        if result.get("status") == "UNAUTHORIZED":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=result.get("error"))
        if result.get("status") == "NOT_FOUND":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result.get("error"))
        if result.get("status") in ("SSRF_BLOCKED", "CONFIRMATION_INVALID"):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result.get("error"))
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=result.get("error"))

    return result


@router.post("/confirm")
def confirm_tool_execution(
    body: ToolConfirmationRequest,
    current_user: dict = Depends(get_current_user),
    conf_mgr: ConfirmationManager = Depends(get_confirmation_manager)
):
    """
    Approve or reject a pending Human Confirmation Ticket.
    """
    user_id = current_user["_id"]
    if body.approved:
        success = conf_mgr.approve_ticket(body.ticket_id, user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Ticket is invalid, expired, or does not belong to the user."
            )
        return {"status": "APPROVED", "ticket_id": body.ticket_id}
    else:
        conf_mgr.reject_ticket(body.ticket_id, user_id)
        return {"status": "REJECTED", "ticket_id": body.ticket_id}
