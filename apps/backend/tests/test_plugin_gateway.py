import pytest
from app.tools.gateway import ToolGateway
from app.tools.registry import ToolRegistry
from app.tools.confirmation import ConfirmationManager
from app.tools.contracts import ToolDefinition, PermissionTier


@pytest.mark.asyncio
async def test_gateway_ssrf_blocking():
    gateway = ToolGateway()

    # Blocked loopback and private IPs
    assert gateway.is_url_safe("http://127.0.0.1:8000/api") is False
    assert gateway.is_url_safe("http://localhost:3000/test") is False
    assert gateway.is_url_safe("http://169.254.169.254/latest/meta-data/") is False
    assert gateway.is_url_safe("http://192.168.1.100/admin") is False
    assert gateway.is_url_safe("http://10.0.0.1/private") is False

    # Allowed public URLs
    assert gateway.is_url_safe("https://api.github.com/repos/octocat/Hello-World") is True
    assert gateway.is_url_safe("https://google.com/search") is True


@pytest.mark.asyncio
async def test_gateway_confirmation_flow():
    registry = ToolRegistry()
    conf_mgr = ConfirmationManager(ttl_seconds=60)
    gateway = ToolGateway(registry=registry, confirmation_mgr=conf_mgr)

    # Register a sensitive tool requiring confirmation
    async def sample_destructive_action(user_id: str, **kwargs):
        return {"result": "Action successfully performed"}

    registry.register(ToolDefinition(
        id="test.delete_something",
        name="Delete Something",
        description="Delete a critical asset",
        category="test",
        permission_tier=PermissionTier.DELETE,
        input_schema={"type": "object"},
        output_schema={"type": "object"},
        requires_confirmation=True,
        handler=sample_destructive_action
    ))

    # 1. First call without ticket -> MUST return CONFIRMATION_REQUIRED
    res1 = await gateway.execute_tool(
        tool_id="test.delete_something",
        params={"target_id": "item_123"},
        user_id="user_test_1"
    )
    assert res1["success"] is False
    assert res1["status"] == "CONFIRMATION_REQUIRED"
    assert "ticket_id" in res1
    ticket_id = res1["ticket_id"]

    # 2. Call with unapproved ticket -> MUST fail
    res2 = await gateway.execute_tool(
        tool_id="test.delete_something",
        params={"target_id": "item_123"},
        user_id="user_test_1",
        confirmation_ticket_id=ticket_id
    )
    # Ticket was PENDING, not approved yet
    assert conf_mgr.approve_ticket(ticket_id, "user_test_1") is True

    # 3. Call with approved ticket -> MUST succeed and consume ticket
    res3 = await gateway.execute_tool(
        tool_id="test.delete_something",
        params={"target_id": "item_123"},
        user_id="user_test_1",
        confirmation_ticket_id=ticket_id
    )
    assert res3["success"] is True
    assert res3["status"] == "COMPLETED"
    assert res3["data"]["result"] == "Action successfully performed"

    # 4. Ticket reuse attempt -> MUST fail
    res4 = await gateway.execute_tool(
        tool_id="test.delete_something",
        params={"target_id": "item_123"},
        user_id="user_test_1",
        confirmation_ticket_id=ticket_id
    )
    assert res4["success"] is False
    assert res4["status"] == "CONFIRMATION_INVALID"
