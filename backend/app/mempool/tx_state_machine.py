from app.mempool.models import LiveTransaction
from app.mempool.tx_cache import tx_cache
from app.services.connection_manager import manager
from app.services.event_engine import event_engine

class TxStateMachine:
    VALID_TRANSITIONS = {
        "idle": ["broadcasting", "failed"],
        "broadcasting": ["pending", "failed", "dropped"],
        "pending": ["confirming", "failed", "replaced", "dropped"],
        "confirming": ["confirmed", "failed"],
        "replaced": ["pending"], # Replaced implies a new tx hash is now pending
        "confirmed": [],
        "failed": [],
        "dropped": []
    }

    async def transition(self, tx: LiveTransaction, new_status: str, block_number: int = None, confirmations: int = 0):
        current_status = tx.status
        
        # Enforce valid transitions
        if new_status not in self.VALID_TRANSITIONS.get(current_status, []):
            # Special case: Sometimes we miss states (e.g. pending -> confirmed directly if block is fast)
            if current_status == "pending" and new_status == "confirmed":
                pass # Allow skip
            else:
                print(f"[STATE_MACHINE] Invalid transition for {tx.txHash}: {current_status} -> {new_status}")
                return

        print(f"[STATE_MACHINE] {tx.txHash}: {current_status} -> {new_status}")
        
        tx.status = new_status
        if block_number:
            tx.blockNumber = block_number
        tx.confirmations = confirmations
        
        # Update Cache
        await tx_cache.set_tx(tx)

        # Ensure tracked in lifecycle pool if not confirmed
        if new_status in ["pending", "confirming"]:
            await tx_cache.add_to_lifecycle_pool(tx.chainId, tx.txHash)

        # Dispatch via Event Engine
        event_type = self._map_status_to_event(new_status)
        if event_type:
            # Pydantic v2 uses model_dump, v1 uses dict
            payload = tx.model_dump() if hasattr(tx, 'model_dump') else tx.dict()
            # Push to the wallet
            await manager.emit(tx.walletAddress, event_type, payload)

    def _map_status_to_event(self, status: str) -> str:
        mapping = {
            "pending": "TX_PENDING",
            "confirming": "TX_CONFIRMING",
            "confirmed": "TX_CONFIRMED",
            "failed": "TX_FAILED",
            "replaced": "TX_REPLACED",
        }
        return mapping.get(status)

tx_state_machine = TxStateMachine()
