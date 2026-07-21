from typing import Dict, List, Any
import json
from fastapi import WebSocket
from abc import ABC, abstractmethod
from app.services.notification_persistence import notification_persistence

import asyncio
from typing import Dict, List, Any, Optional
import json
from fastapi import WebSocket
from abc import ABC, abstractmethod
from app.services.notification_persistence import notification_persistence
from app.services.redis_service import redis_service

class BaseConnectionManager(ABC):
    @abstractmethod
    async def connect(self, websocket: WebSocket, wallet_address: str):
        pass

    @abstractmethod
    async def disconnect(self, wallet_address: str, websocket: WebSocket):
        pass

    @abstractmethod
    async def emit(self, wallet_address: str, event_type: str, payload: dict):
        pass

class RedisConnectionManager(BaseConnectionManager):
    def __init__(self):
        # Maps wallet_address to a list of active WebSockets LOCAL to this node
        self.local_connections: Dict[str, List[WebSocket]] = {}
        self.redis_channel = "wnc_global_events"
        self._listener_task: Optional[asyncio.Task] = None

    async def connect(self, websocket: WebSocket, wallet_address: str):
        await websocket.accept()
        wallet_address = wallet_address.lower()
        
        if wallet_address not in self.local_connections:
            self.local_connections[wallet_address] = []
            # First socket for this wallet on this node
            await redis_service.set(f"presence:{wallet_address}", "online", expire=3600)

        self.local_connections[wallet_address].append(websocket)
        
        print(f"[WS_REDIS] Connected {wallet_address} to local node.")

        # Flush pending events from Redis
        queue_key = f"offline_queue:{wallet_address}"
        while True:
            # RPOP returns None if empty
            event_json = await redis_service.client.rpop(queue_key)
            if not event_json:
                break
            
            try:
                await websocket.send_text(event_json)
                print(f"[WS_REDIS] Flushed offline event to {wallet_address}")
            except Exception as e:
                # If we fail to send, push back to queue (this is simplified)
                await redis_service.client.rpush(queue_key, event_json)
                break

    async def disconnect(self, wallet_address: str, websocket: WebSocket):
        wallet_address = wallet_address.lower()
        if wallet_address in self.local_connections:
            if websocket in self.local_connections[wallet_address]:
                self.local_connections[wallet_address].remove(websocket)
            if not self.local_connections[wallet_address]:
                del self.local_connections[wallet_address]
                # Last socket for this wallet on this node
                await redis_service.delete(f"presence:{wallet_address}")
        print(f"[WS_REDIS] Disconnected {wallet_address} from local node.")

    async def emit(self, wallet_address: str, event_type: str, payload: dict):
        """
        DISTRIBUTED EMIT
        Publishes the event to Redis. All nodes will hear this and 
        check if they have the wallet connected locally.
        """
        wallet_address = wallet_address.lower()
        
        # 1. Persist to DB first (Canonical History)
        await notification_persistence.persist_event(wallet_address, event_type, payload)

        # 2. Publish to Redis Pub/Sub for real-time delivery
        message = {
            "target": wallet_address,
            "type": event_type,
            "payload": payload
        }
        await redis_service.publish(self.redis_channel, message)

    async def broadcast(self, event_type: str, payload: dict):
        """Broadcasts to every connected socket across ALL nodes."""
        message = {
            "target": "ALL",
            "type": event_type,
            "payload": payload
        }
        await redis_service.publish(self.redis_channel, message)

    async def start_redis_listener(self):
        """Starts the background task that listens for global events from Redis."""
        pubsub = await redis_service.subscribe(self.redis_channel)
        print(f"[REDIS_SYNC] Listening for global events on {self.redis_channel}...")
        
        async def listen():
            while True:
                try:
                    message = await pubsub.get_message(ignore_subscribe_messages=True)
                    if message:
                        data = json.loads(message["data"])
                        target = data.get("target")
                        
                        # Forward to local sockets
                        if target == "ALL":
                            await self._local_broadcast(data)
                        else:
                            await self._local_emit(target, data)
                except Exception as e:
                    print(f"[REDIS_SYNC_ERROR] {e}")
                await asyncio.sleep(0.01)

        self._listener_task = asyncio.create_task(listen())

    async def _local_emit(self, wallet_address: str, message: dict):
        """Actually sends the message to the local sockets if present."""
        if wallet_address in self.local_connections:
            text_data = json.dumps(message)
            dead_sockets = []
            for ws in self.local_connections[wallet_address]:
                try:
                    await ws.send_text(text_data)
                except:
                    dead_sockets.append(ws)
            
            for ds in dead_sockets:
                await self.disconnect(wallet_address, ds)
        else:
            # If not connected to THIS node, we don't queue it here.
            # But wait, how do we know if it's connected to ANY node?
            # We use a Redis Set for presence.
            is_online = await redis_service.exists(f"presence:{wallet_address}")
            if not is_online:
                # Only ONE node should queue the offline event to avoid duplicates.
                # We use a distributed lock or just have the originating node handle it.
                # Simplified: The node that called 'emit' handles queuing if no one acknowledged.
                # For now, let's just queue it if we are the one who started the emit.
                # Actually, let's just queue it in Redis if the target isn't in 'active_wallets' set.
                pass

    async def _local_broadcast(self, message: dict):
        text_data = json.dumps(message)
        for wallet, sockets in list(self.local_connections.items()):
            dead_sockets = []
            for ws in sockets:
                try:
                    await ws.send_text(text_data)
                except:
                    dead_sockets.append(ws)
            for ds in dead_sockets:
                await self.disconnect(wallet, ds)

# Instantiate the default manager
manager = RedisConnectionManager()
