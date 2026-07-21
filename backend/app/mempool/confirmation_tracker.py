from app.mempool.tx_cache import tx_cache
from app.mempool.tx_state_machine import tx_state_machine
from typing import Dict

class ConfirmationTracker:
    def __init__(self):
        # Maps chainId to the latest known block number
        self.latest_blocks: Dict[int, int] = {}
        
        # Maps chainId to required confirmation depths
        self.CONFIRMATION_POLICIES = {
            1: 3,       # Ethereum
            137: 5,     # Polygon
            42161: 3,   # Arbitrum
            10: 3,      # Optimism
            8453: 3,    # Base
            56: 3,      # BSC
        }

    async def update_block(self, chain_id: int, block_number: int):
        if chain_id not in self.latest_blocks or block_number > self.latest_blocks[chain_id]:
            self.latest_blocks[chain_id] = block_number
            await self._process_confirming_txs(chain_id, block_number)

    async def _process_confirming_txs(self, chain_id: int, current_block: int):
        required_depth = self.CONFIRMATION_POLICIES.get(chain_id, 1)
        
        # Get all hashes being tracked for this chain from Redis
        tracked_hashes = await tx_cache.get_lifecycle_pool(chain_id)
        
        for tx_hash in tracked_hashes:
            tx = await tx_cache.get_tx(tx_hash)
            if not tx:
                continue

            if tx.status in ["confirming", "pending"]:
                if tx.blockNumber and tx.blockNumber <= current_block:
                    confirmations = (current_block - tx.blockNumber) + 1
                    
                    if confirmations >= required_depth:
                        await tx_state_machine.transition(tx, "confirmed", block_number=current_block, confirmations=confirmations)
                        # Remove from lifecycle pool once fully confirmed
                        await tx_cache.remove_from_lifecycle_pool(chain_id, tx_hash)
                    else:
                        await tx_state_machine.transition(tx, "confirming", block_number=current_block, confirmations=confirmations)

confirmation_tracker = ConfirmationTracker()
