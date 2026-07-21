from typing import Dict, Any, Optional, Literal
import uuid
import time

class NotificationEngine:
    @staticmethod
    def build_notification(
        type: str,
        title: str,
        body: str,
        priority: Literal["low", "normal", "high", "critical"] = "normal",
        wallet_id: Optional[str] = None
    ) -> dict:
        return {
            "id": f"notif_{uuid.uuid4().hex[:8]}",
            "type": type,
            "title": title,
            "body": body,
            "priority": priority,
            "timestamp": int(time.time()),
            "walletId": wallet_id,
            "read": False
        }

notification_engine = NotificationEngine()
