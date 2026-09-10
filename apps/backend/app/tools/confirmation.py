import time
import uuid
import threading
from typing import Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class ConfirmationTicket:
    ticket_id: str
    user_id: str
    tool_id: str
    action_summary: str
    params: Dict[str, Any]
    created_at: float
    expires_at: float
    status: str = "PENDING"  # PENDING, APPROVED, REJECTED, EXPIRED


class ConfirmationManager:
    """
    Thread-safe manager for Human-in-the-loop tool confirmations.
    Enforces user ownership, one-time ticket consumption, and 10-minute TTL.
    """

    def __init__(self, ttl_seconds: int = 600):
        self.ttl_seconds = ttl_seconds
        self._tickets: Dict[str, ConfirmationTicket] = {}
        self._lock = threading.Lock()

    def create_ticket(
        self,
        user_id: str,
        tool_id: str,
        action_summary: str,
        params: Dict[str, Any]
    ) -> ConfirmationTicket:
        with self._lock:
            ticket_id = f"conf_{uuid.uuid4().hex[:12]}"
            now = time.time()
            ticket = ConfirmationTicket(
                ticket_id=ticket_id,
                user_id=user_id,
                tool_id=tool_id,
                action_summary=action_summary,
                params=params,
                created_at=now,
                expires_at=now + self.ttl_seconds,
                status="PENDING"
            )
            self._tickets[ticket_id] = ticket
            self._purge_expired()
            return ticket

    def get_ticket(self, ticket_id: str) -> Optional[ConfirmationTicket]:
        with self._lock:
            ticket = self._tickets.get(ticket_id)
            if not ticket:
                return None
            if time.time() > ticket.expires_at:
                ticket.status = "EXPIRED"
                return None
            return ticket

    def verify_ticket(self, ticket_id: str, user_id: str) -> bool:
        ticket = self.get_ticket(ticket_id)
        if not ticket:
            return False
        return ticket.user_id == user_id and ticket.status in ("PENDING", "APPROVED")

    def approve_ticket(self, ticket_id: str, user_id: str) -> bool:
        with self._lock:
            ticket = self._tickets.get(ticket_id)
            if not ticket or ticket.user_id != user_id:
                return False
            if time.time() > ticket.expires_at:
                ticket.status = "EXPIRED"
                return False
            ticket.status = "APPROVED"
            return True

    def consume_ticket(self, ticket_id: str) -> Optional[ConfirmationTicket]:
        with self._lock:
            ticket = self._tickets.pop(ticket_id, None)
            return ticket

    def reject_ticket(self, ticket_id: str, user_id: str) -> bool:
        with self._lock:
            ticket = self._tickets.get(ticket_id)
            if not ticket or ticket.user_id != user_id:
                return False
            ticket.status = "REJECTED"
            self._tickets.pop(ticket_id, None)
            return True

    def _purge_expired(self):
        now = time.time()
        expired = [tid for tid, t in self._tickets.items() if now > t.expires_at]
        for tid in expired:
            self._tickets.pop(tid, None)


_global_confirmation_manager = ConfirmationManager()


def get_confirmation_manager() -> ConfirmationManager:
    return _global_confirmation_manager
