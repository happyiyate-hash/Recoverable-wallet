import asyncio
import json
import os
from typing import Set
from app.mempool.watchers.base_watcher import BaseWatcher
from app.mempool.tx_state_machine import tx_state_machine
from app.mempool.models import LiveTransaction
from app.mempool.tx_cache import tx_cache
from app.services.security_engine import security_engine
from app.services.connection_manager import manager
from app.services.event_engine import event_engine
from app.services.redis_service import redis_service
from web3 import Web3
import eth_utils

# Optional dependency for raw websockets
try:
    import websockets
except ImportError:
    websockets = None

class EVMWatcher(BaseWatcher):
    def __init__(self, chain_id: int, rpc_url: str):
        self.chain_id = chain_id
        self.rpc_url = rpc_url
        # Use HTTP for reliable hydration, WSS for mempool stream
        self.http_url = rpc_url.replace("wss://", "https://")
        self.w3 = Web3(Web3.HTTPProvider(self.http_url))
        self.watched_addresses: Set[str] = set()
        self._running = False
        self._task = None
        self._erc20_transfer_hash = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

    async def start(self):
        if not websockets:
            print("[EVM_WATCHER] 'websockets' library not installed. Skipping mempool connection.")
            return

        self._running = True
        self._task = asyncio.create_task(self._listen_loop())
        print(f"[EVM_WATCHER] Started for chain {self.chain_id}")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
        print(f"[EVM_WATCHER] Stopped for chain {self.chain_id}")

    def add_address(self, address: str):
        self.watched_addresses.add(address.lower())

    def remove_address(self, address: str):
        if address.lower() in self.watched_addresses:
            self.watched_addresses.remove(address.lower())

    async def _listen_loop(self):
        retry_delay = 1
        while self._running:
            try:
                # Basic setup for Alchemy / standard eth_subscribe
                async with websockets.connect(self.rpc_url) as ws:
                    print(f"[EVM_WATCHER] Connected to node for chain {self.chain_id}")
                    
                    # Subscribe to pending transactions
                    sub_request = {
                        "jsonrpc": "2.0",
                        "id": 1,
                        "method": "eth_subscribe",
                        "params": ["newPendingTransactions"]
                    }
                    await ws.send(json.dumps(sub_request))

                    while self._running:
                        msg = await ws.recv()
                        data = json.loads(msg)
                        
                        # Process subscription payload
                        if "params" in data and "result" in data["params"]:
                            tx_hash = data["params"]["result"]
                            await self._handle_pending_tx(tx_hash, ws)

            except Exception as e:
                print(f"[EVM_WATCHER] Connection dropped: {e}. Reconnecting in {retry_delay}s...")
                await asyncio.sleep(retry_delay)
                retry_delay = min(retry_delay * 2, 30)

    async def _handle_pending_tx(self, tx_hash: str, ws):
        try:
            # 1. HYDRATE TRANSACTION DATA (AUTHORITATIVE)
            # Use run_in_executor for synchronous Web3 calls
            loop = asyncio.get_event_loop()
            tx = await loop.run_in_executor(None, lambda: self.w3.eth.get_transaction(tx_hash))
            if not tx:
                return

            tx_from = tx['from'].lower()
            tx_to = (tx['to'] or "").lower()
            
            # 2. MATCH AGAINST WATCHED REGISTRY
            is_relevant = tx_from in self.watched_addresses or tx_to in self.watched_addresses
            
            # 3. ERC20 DEEP INSPECTION (If not a simple transfer)
            token_address = None
            amount = float(self.w3.from_wei(tx['value'], 'ether'))
            symbol = 'ETH' # Refine based on chain
            
            # Simple check for ERC20 Transfer method (0xa9059cbb)
            if tx['input'].startswith('0xa9059cbb'):
                # Extract 'to' and 'value' from input data
                try:
                    # input = method_id (4 bytes) + to (32 bytes) + value (32 bytes)
                    to_data = tx['input'][10:74]
                    val_data = tx['input'][74:138]
                    erc20_to = "0x" + to_data[-40:].lower()
                    if erc20_to in self.watched_addresses or tx_from in self.watched_addresses:
                        is_relevant = True
                        token_address = tx_to
                        # We would ideally fetch decimals here, but using 18 as default for demo hydration
                        # In production, we'd cache decimals per token_address
                        amount = int(val_data, 16) / 10**18 
                        symbol = 'ERC20' 
                except:
                    pass

            if not is_relevant:
                return

            print(f"[WATCHTOWER_MATCH] Detected {tx_hash} | {tx_from} -> {tx_to}")

            # 4. SECURITY ANALYSIS
            analysis_data = {
                "hash": tx_hash,
                "from": tx_from,
                "to": tx_to,
                "input": tx['input'],
                "value": str(tx['value'])
            }
            security_alert = security_engine.analyze_transaction(analysis_data)
            
            if security_alert:
                for wallet in [tx_from, tx_to]:
                    if wallet in self.watched_addresses and await redis_service.exists(f"presence:{wallet}"):
                        payload = event_engine.build_security_alert_payload(
                            tx_hash=tx_hash,
                            warning_msg=security_alert["message"],
                            risk_level=security_alert["priority"]
                        )
                        await manager.emit(wallet, "SECURITY_ALERT", payload)

            # 5. STATE MACHINE TRANSITION (CANONICAL)
            live_tx = LiveTransaction(
                hash=tx_hash,
                from_address=tx_from,
                to_address=tx_to if not token_address else erc20_to,
                amount=amount,
                symbol=symbol,
                chain_id=self.chain_id,
                status="pending",
                token_address=token_address
            )
            
            await tx_state_machine.transition(live_tx, "pending")
            
            # 6. BROADCAST REAL-TIME DETECTION
            for wallet in [tx_from, tx_to if not token_address else erc20_to]:
                if wallet in self.watched_addresses:
                    await manager.emit(wallet, "TRANSACTION_DETECTED", live_tx.dict())

        except Exception as e:
            # tx might not be in mempool anymore or RPC error
            pass

# Setup instance reading from env if available
ALCHEMY_WS_URL = os.getenv("ALCHEMY_WS_URL", "wss://eth-mainnet.g.alchemy.com/v2/demo")
evm_watcher_mainnet = EVMWatcher(chain_id=1, rpc_url=ALCHEMY_WS_URL)
