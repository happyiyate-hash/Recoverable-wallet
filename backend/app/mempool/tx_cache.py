from typing import Dict, Optional
from app.mempool.models import LiveTransaction
import time

from typing import Dict, Optional
from app.mempool.models import LiveTransaction
from app.services.redis_service import redis_service
import json
import time

class TxCache:
    def __init__(self):
        self.redis_key = "wnc_tx_cache"
        self.ttl = 7200 # 2 hours cache

    async def get_tx(self, tx_hash: str) -> Optional[LiveTransaction]:
        data = await redis_service.client.hget(self.redis_key, tx_hash)
        if not data:
            return None
        
        try:
            # Reconstruct LiveTransaction from JSON
            parsed = json.loads(data)
            return LiveTransaction(**parsed)
        except Exception as e:
            print(f"[TX_CACHE_ERROR] Hydration failed for {tx_hash}: {e}")
            return None

    async def set_tx(self, tx: LiveTransaction):
        # Serialize to JSON for storage
        tx_dict = tx.dict() if hasattr(tx, 'dict') else tx.__dict__
        await redis_service.client.hset(self.redis_key, tx.txHash, json.dumps(tx_dict))
        # Ensure we don't hold them forever (cleanup happens via background or manual)
        # Note: Redis Hash doesn't support per-field TTL natively.
        # In production we would use a separate key per TX if TTL is strict.
        pass

    async def update_status(self, tx_hash: str, new_status: str, block_number: Optional[int] = None, confirmations: int = 0):
        tx = await self.get_tx(tx_hash)
        if tx:
            tx.status = new_status
            tx.confirmations = confirmations
            if block_number:
                tx.blockNumber = block_number
            await self.set_tx(tx)

    async def is_tracked(self, tx_hash: str) -> bool:
        return await redis_service.client.hexists(self.redis_key, tx_hash)

    async def add_to_lifecycle_pool(self, chain_id: int, tx_hash: str):
        """Adds a TX to the tracking pool for a specific chain."""
        await redis_service.client.sadd(f"wnc_pool:{chain_id}", tx_hash)

    async def get_lifecycle_pool(self, chain_id: int) -> List[str]:
        """Returns all TX hashes currently being tracked for a chain."""
        return await redis_service.client.smembers(f"wnc_pool:{chain_id}")

    async def remove_from_lifecycle_pool(self, chain_id: int, tx_hash: str):
        await redis_service.client.srem(f"wnc_pool:{chain_id}", tx_hash)

tx_cache = TxCache()
