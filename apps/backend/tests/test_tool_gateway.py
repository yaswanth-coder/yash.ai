import pytest
from app.tools.contracts import PermissionTier
from app.tools.confirmation import ConfirmationManager
from app.tools.gateway import ToolGateway


@pytest.mark.asyncio
async def test_ssrf_blocks_private_addresses():
    gateway = ToolGateway()
    assert gateway.is_url_safe("http://127.0.0.1:8000/secret") is False
    assert gateway.is_url_safe("http://localhost:3000") is False
    assert gateway.is_url_safe("http://169.254.169.254/latest/meta-data") is False
    assert gateway.is_url_safe("http://10.0.0.1/admin") is False
    assert gateway.is_url_safe("http://192.168.1.1/router") is False
    assert gateway.is_url_safe("https://en.wikipedia.org/wiki/Artificial_intelligence") is True
    assert gateway.is_url_safe("https://api.github.com") is True


@pytest.mark.asyncio
async def test_confirmation_ticket_lifecycle():
    cm = ConfirmationManager()
    ticket = cm.create_ticket(
        user_id="user123",
        tool_id="files.delete",
        action_summary="Delete project asset doc.pdf",
        params={"file_id": "abc"}
    )
    assert ticket.ticket_id is not None
    assert cm.verify_ticket(ticket.ticket_id, "user123") is True
    assert cm.verify_ticket(ticket.ticket_id, "different_user") is False
    
    # Consuming the ticket should invalidate it
    cm.consume_ticket(ticket.ticket_id)
    assert cm.verify_ticket(ticket.ticket_id, "user123") is False
