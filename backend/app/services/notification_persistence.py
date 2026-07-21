import json
from app.db import db
from typing import Dict, Any

class NotificationPersistence:
    # Only persist these events
    PERSISTABLE_EVENTS = {
        # CORE BLOCKCHAIN
        "SEND", "RECEIVE", "SWAP", "BRIDGE", "APPROVE", "STAKE", "UNSTAKE",
        
        # LIFECYCLE
        "TX_PENDING", "TX_CONFIRMING", "TX_CONFIRMED", "TX_FAILED", "TX_REPLACED",
        
        # SECURITY
        "SECURITY_ALERT", "HIGH_RISK_APPROVAL", "DRAINER_RISK",
        
        # SYSTEM
        "ROUTE_SWITCHED", "BACKEND_RECONNECTED", "WEBSOCKET_RESTORED", "NETWORK_DEGRADED"
    }

    @classmethod
    async def persist_event(cls, wallet_address: str, event_type: str, payload: Dict[str, Any]):
        """
        Takes a generated event and persists it to the Supabase database
        if it meets the persistence criteria.
        """
        if event_type not in cls.PERSISTABLE_EVENTS:
            return
            
        try:
            # Look up the user_id for the wallet_address
            # In a real system, you would have a caching layer for this
            user_res = db.table("wallets").select("user_id").eq("address", wallet_address).execute()
            if not user_res.data:
                return
                
            user_id = user_res.data[0]["user_id"]
            
            # Extract standard fields
            priority = payload.get("priority", "NORMAL")
            title = payload.get("title", "System Notification")
            message = payload.get("message", "")
            event_id = payload.get("eventId")
            tx_hash = payload.get("payload", {}).get("txHash")
            chain_id = payload.get("payload", {}).get("chainId")
            
            # The entire inner payload goes into metadata
            metadata = payload.get("payload", {})

            # Insert into notifications table
            db.table("notifications").insert({
                "user_id": user_id,
                "type": event_type,
                "priority": priority,
                "title": title,
                "message": message,
                "metadata": metadata,
                "event_id": event_id,
                "tx_hash": tx_hash,
                "chain_id": chain_id,
                "source": "watchtower",
                "is_read": False,
                "dismissed": False
            }).execute()
            
            print(f"[PERSISTENCE] Successfully saved {event_type} for {wallet_address}")
            
        except Exception as e:
            print(f"[PERSISTENCE_ERROR] Failed to save event to DB: {e}")

notification_persistence = NotificationPersistence()
