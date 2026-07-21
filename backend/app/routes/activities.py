from fastapi import APIRouter, Query, HTTPException
from typing import List, Optional
from app.db import db

router = APIRouter(prefix="/activities", tags=["activities"])

@router.get("/{wallet_address}")
async def get_activities(
    wallet_address: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    event_type: Optional[str] = None,
    chain_id: Optional[int] = None,
    priority: Optional[str] = None
):
    """
    CANONICAL ACTIVITIES API
    Version: 1.0.0
    
    Returns a paginated list of normalized activity events from the 
    institutional persistence layer.
    """
    try:
        # 1. Resolve User ID from Wallet
        user_res = db.table("wallets").select("user_id").eq("address", wallet_address).execute()
        if not user_res.data:
            return {"data": [], "total": 0, "page": page}

        user_id = user_res.data[0]["user_id"]

        # 2. Build Query
        query = db.table("notifications").select("*").eq("user_id", user_id)

        if event_type:
            query = query.eq("type", event_type)
        if chain_id:
            query = query.eq("chain_id", chain_id)
        if priority:
            query = query.eq("priority", priority)

        # 3. Sort & Paginate
        offset = (page - 1) * page_size
        query = query.order("created_at", desc=True).range(offset, offset + page_size - 1)

        result = query.execute()

        # 4. Normalize for Frontend
        normalized = []
        for row in result.data:
            normalized.append({
                "eventId": row.get("event_id"),
                "eventType": row.get("type"),
                "txHash": row.get("tx_hash"),
                "chainId": row.get("chain_id"),
                "title": row.get("title"),
                "subtitle": row.get("message"),
                "priority": row.get("priority", "NORMAL").lower(),
                "status": row.get("metadata", {}).get("status", "confirmed"),
                "amount": row.get("metadata", {}).get("amount"),
                "symbol": row.get("metadata", {}).get("symbol"),
                "metadata": row.get("metadata", {}),
                "createdAt": row.get("created_at")
            })

        return {
            "data": normalized,
            "total": len(normalized), # Simple total for current window
            "page": page,
            "pageSize": page_size
        }

    except Exception as e:
        print(f"[ACTIVITIES_API_ERROR] {e}")
        raise HTTPException(status_code=500, detail="Internal node error during activity hydration.")
