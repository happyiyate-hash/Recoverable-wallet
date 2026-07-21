
from fastapi import APIRouter, Request, Header, HTTPException
from app.config import PAYMENT_WEBHOOK_SECRET
from app.services.wallet import get_profile_by_account, credit_wallet
from app.db import db
from app.services.connection_manager import manager
from app.services.event_engine import event_engine
from app.services.notification_engine import notification_engine

router = APIRouter(prefix="/webhooks", tags=["webhooks"])

@router.post("/deposit")
async def deposit_webhook(
    request: Request,
    x_signature: str = Header(None)
):
    """
    Sentinels incoming payment notifications from the bank rails.
    """
    if x_signature != PAYMENT_WEBHOOK_SECRET:
        # In production, use HMAC verification for strict authority
        raise HTTPException(401, "UNAUTHORIZED_WEBHOOK_SIGNAL")

    body = await request.json()

    # Normalize fields (Example based on standard provider payloads)
    reference = body.get("reference") or body.get("tx_ref")
    account_number = body.get("account_number") or body.get("customer", {}).get("account_number")
    amount = body.get("amount")

    if not reference or not account_number or not amount:
        raise HTTPException(400, "INVALID_PAYLOAD_SCHEMA")

    # 1. Duplicate Detection
    existing = db.table("wnc_transfers").select("id").eq(
        "reference",
        reference
    ).execute().data

    if existing:
        return {"success": True, "status": "DUPLICATE_IGNORED"}

    # 2. Identity Resolution
    user = get_profile_by_account(account_number)

    if not user:
        print(f"[WEBHOOK_ADVISORY] Account {account_number} not mapped to any node.")
        return {"success": False, "reason": "NODE_NOT_FOUND"}

    # 3. Ledger Credit
    credit_wallet(
        user["id"],
        float(amount),
        reference,
        body
    )

    # 4. Emit Real-Time Events
    # In a real scenario, you map user to their wallets (e.g. EVM, Solana). We emit to the EVM address as primary.
    evm_address = user.get("evm_address")
    
    if evm_address:
        # Emit Balance Updated
        balance_payload = event_engine.build_balance_updated_payload(
            chain="fiat",  # Or 'polygon' etc depending on logic
            token="USD",   # Example token
            balance=str(float(user.get("balance", 0)) + float(amount)) # Rough approximation for Phase 1
        )
        await manager.emit(evm_address, "BALANCE_UPDATED", balance_payload)

        # Emit Toast Notification
        notification_payload = notification_engine.build_notification(
            type="TOKEN_RECEIVED",
            title="Funds Deposited",
            body=f"Successfully credited {amount} to your registry.",
            severity="success",
            wallet_id=user["id"]
        )
        await manager.emit(evm_address, "NOTIFICATION", notification_payload)

    return {
        "success": True,
        "credited": amount,
        "user_id": user["id"]
    }
