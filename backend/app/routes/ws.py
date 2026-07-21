from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Path
from app.services.connection_manager import manager
import json

router = APIRouter()

@router.websocket("/ws/{wallet_address}")
async def websocket_endpoint(
    websocket: WebSocket,
    wallet_address: str = Path(..., description="The wallet address connecting")
):
    await manager.connect(websocket, wallet_address)
    try:
        while True:
            text_data = await websocket.receive_text()
            try:
                data = json.loads(text_data)
                msg_type = data.get("type")
                if msg_type == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG"}))
                elif msg_type == "DEVICE_INFO":
                    await manager.register_device(wallet_address, data.get("payload", {}))
            except json.JSONDecodeError:
                pass # Ignore malformed
    except WebSocketDisconnect:
        await manager.disconnect(wallet_address, websocket)
