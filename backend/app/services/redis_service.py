import redis.asyncio as redis
import json
from app.config import REDIS_URL
from typing import Optional, Any

class RedisService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RedisService, cls).__new__(cls)
            cls._instance.client = redis.from_url(REDIS_URL, decode_responses=True)
            cls._instance.pubsub = cls._instance.client.pubsub()
        return cls._instance

    async def set(self, key: str, value: Any, expire: Optional[int] = None):
        if isinstance(value, (dict, list)):
            value = json.dumps(value)
        await self.client.set(key, value, ex=expire)

    async def get(self, key: str) -> Optional[str]:
        return await self.client.get(key)

    async def publish(self, channel: str, message: Any):
        if isinstance(message, (dict, list)):
            message = json.dumps(message)
        await self.client.publish(channel, message)

    async def subscribe(self, channel: str):
        await self.pubsub.subscribe(channel)
        return self.pubsub

    async def delete(self, key: str):
        await self.client.delete(key)

    async def exists(self, key: str) -> bool:
        return await self.client.exists(key) > 0

redis_service = RedisService()
