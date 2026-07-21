
from fastapi import APIRouter, Request, HTTPException
from app.ledger.balances import credit_user_balance
from app.database import get_db

/**
 * INSTITUTIONAL WEBHOOK SENTINEL
 * Version: 1.0.0
 * Handles incoming payment notifications from providers like Flutterwave or Monnify.
 */

router = APIRouter(prefix="/webhooks", tags=["webhooks"])
db = get_db()

@router.post("/deposit")
async def handle_deposit_webhook(request: Request):
    payload = await request.json()
    
    # 1. Extract Handshake Metadata
    # Example mapping: Flutterwave 'tx_ref' or Monnify 'paymentReference'
    account_number = payload.get("account_number") or payload.get("customer", {}).get("account_number")
    amount = payload.get("amount")
    tx_id = payload.get("id") or payload.get("transaction_id")

    if not account_number or not amount:
        raise HTTPException(status_code=400, detail="INVALID_PAYLOAD")

    # 2. Resolve Identity Node
    try:
        user_result = db.table("profiles").select("id").eq("account_number", account_number).single().execute()
        if not user_result.data:
            print(f"[WEBHOOK_ADVISORY] Account {account_number} not found in registry.")
            return {"status": "ignored", "reason": "ACCOUNT_NOT_FOUND"}

        user_id = user_result.data["id"]

        # 3. Credit Ledger
        success = credit_user_balance(user_id, amount, reference=f"FIN_DEPOSIT:{tx_id}")
        
        if success:
            return {"status": "success", "user_id": user_id, "credited": amount}
        else:
            raise HTTPException(status_code=500, detail="LEDGER_SYNC_FAILED")

    except Exception as e:
        print(f"[WEBHOOK_CRITICAL_FAIL] {str(e)}")
        raise HTTPException(status_code=500, detail="INTERNAL_SERVER_ERROR")
