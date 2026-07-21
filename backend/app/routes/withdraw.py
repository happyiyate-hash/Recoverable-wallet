
from fastapi import APIRouter, HTTPException
from app.db import db
from app.services.flutterwave import send_transfer
from app.models import WithdrawRequest
import uuid

router = APIRouter(prefix="/withdraw", tags=["withdraw"])

@router.post("/")
async def handle_withdraw(payload: WithdrawRequest):
    """
    Executes an institutional withdrawal: Ledger Lock -> Fee Sync -> Dispatch.
    """
    # 1. Fetch current node state
    user_result = db.table("profiles").select("*").eq("id", payload.user_id).single().execute()
    user = user_result.data
    
    if not user:
        raise HTTPException(404, "IDENTITY_NOT_FOUND")

    balance = float(user.get("wnc_earnings", 0))
    if balance < payload.amount:
        raise HTTPException(400, "INSUFFICIENT_NODE_BALANCE")

    # 2. Calculate Settlement Parameters
    ref = f"WNC_WTH_{uuid.uuid4().hex[:12].upper()}"
    fee = round(payload.amount * 0.01, 2) # 1% Flat
    payout = payload.amount - fee

    try:
        # 3. Atomic Debit (The Lock)
        db.table("profiles").update({
            "wnc_earnings": balance - payload.amount,
            "updated_at": "now()"
        }).eq("id", payload.user_id).execute()

        # 4. Log Revenue Node
        db.table("fees").insert({
            "reference": ref,
            "amount": fee
        }).execute()

        # 5. Dispatch Bank Transfer
        result = await send_transfer(
            payload.bank_code,
            payload.account_number,
            payout,
            ref
        )

        if result.get("status") != "success":
            # ROLLBACK LOGIC: In production, mark as 'failed' and notify admin for manual reconciliation
            db.table("wnc_transfers").insert({
                "sender_id": payload.user_id,
                "receiver_id": "00000000-0000-0000-0000-000000000000",
                "amount_wnc": payload.amount,
                "reference": f"{ref}_FAILED_PROVIDER",
            }).execute()
            raise Exception(result.get("message", "PROVIDER_HANDSHAKE_FAILED"))

        # 6. Finalize Transaction Node
        db.table("wnc_transfers").insert({
            "sender_id": payload.user_id,
            "receiver_id": "00000000-0000-0000-0000-000000000000", # SYSTEM_WITHDRAWAL
            "amount_wnc": payload.amount,
            "reference": ref
        }).execute()

        return {
            "success": True,
            "tx_ref": ref,
            "payout": payout,
            "fee": fee
        }

    except Exception as e:
        raise HTTPException(400, str(e))
