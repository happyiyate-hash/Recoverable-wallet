
from fastapi import APIRouter, Request, Header, HTTPException
from app.db import db
from app.services.flutterwave import create_virtual_account
from app.config import FLW_WEBHOOK_HASH
import os

router = APIRouter(prefix="/flw", tags=["flutterwave"])

@router.post("/create-account/{user_id}")
async def handle_create_account(user_id: str):
    """
    Resolves user profile and provisions a bank account node.
    """
    user_result = db.table("profiles").select("*").eq("id", user_id).single().execute()
    user = user_result.data
    
    if not user:
        raise HTTPException(404, "IDENTITY_NOT_FOUND")

    if user.get("virtual_account_number"):
        return {
            "success": True,
            "account_number": user["virtual_account_number"],
            "bank_name": user["virtual_bank_name"]
        }

    # Dispatch to Flutterwave
    result = await create_virtual_account(user["email"], user["name"])
    
    if result.get("status") != "success":
        raise HTTPException(400, f"FLW_ERROR: {result.get('message')}")

    data = result["data"]
    acct = data["account_number"]
    bank = data["bank_name"]

    # Sync Registry
    db.table("profiles").update({
        "virtual_account_number": acct,
        "virtual_bank_name": bank
    }).eq("id", user_id).execute()

    return {
        "success": True,
        "account_number": acct,
        "bank_name": bank
    }

@router.post("/webhook")
async def deposit_webhook(
    request: Request,
    verif_hash: str = Header(None, alias="verif-hash")
):
    """
    Sentinels incoming Flutterwave deposit signals.
    """
    if verif_hash != FLW_WEBHOOK_HASH:
        raise HTTPException(401, "UNAUTHORIZED_WEBHOOK_SIGNAL")

    body = await request.json()
    
    # Flutterwave standard payload path
    data = body.get("data", body)
    account = data.get("account_number")
    amount = data.get("amount")
    reference = data.get("tx_ref") or data.get("flw_ref")

    if not account or not amount:
        return {"status": "ignored", "reason": "INVALID_PAYLOAD"}

    # 1. Duplicate Detection
    existing = db.table("wnc_transfers").select("id").eq("reference", reference).execute().data
    if existing:
        return {"status": "success", "info": "DUPLICATE_IGNORED"}

    # 2. Resolve Identity Node
    user_result = db.table("profiles").select("*").eq("virtual_account_number", account).single().execute()
    user = user_result.data
    
    if not user:
        return {"status": "error", "reason": "NODE_NOT_FOUND"}

    # 3. Ledger Credit
    new_balance = float(user.get("wnc_earnings", 0)) + float(amount)
    
    db.table("profiles").update({
        "wnc_earnings": new_balance,
        "updated_at": "now()"
    }).eq("id", user["id"]).execute()

    # 4. Log to Immutable Ledger
    db.table("wnc_transfers").insert({
        "receiver_id": user["id"],
        "sender_id": "00000000-0000-0000-0000-000000000000", # SYSTEM_DEPOSIT
        "amount_wnc": amount,
        "reference": reference
    }).execute()

    return {"status": "success", "user_id": user["id"], "credited": amount}
