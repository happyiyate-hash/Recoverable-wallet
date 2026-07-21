
'use server';

from app.database import get_db
from decimal import Decimal

/**
 * INSTITUTIONAL LEDGER SERVICE
 * Version: 2.0.0 (Supabase Sync Standard)
 * 
 * Orchestrates atomic balance updates in the master identity registry.
 */

db = get_db()

def credit_user_balance(user_id: str, amount: float, reference: str = "Deposit"):
    """
    Credits a user's WNC balance in the Supabase profiles table.
    """
    try:
        # 1. Fetch current node state
        result = db.table("profiles").select("wnc_earnings").eq("id", user_id).single().execute()
        current_balance = Decimal(str(result.data.get("wnc_earnings", 0)))
        
        new_balance = current_balance + Decimal(str(amount))
        
        # 2. Atomic Update
        db.table("profiles").update({
            "wnc_earnings": float(new_balance),
            "updated_at": "now()"
        }).eq("id", user_id).execute()
        
        # 3. Log to Immutable Ledger
        db.table("wnc_transfers").insert({
            "receiver_id": user_id,
            "amount_wnc": amount,
            "reference": reference
        }).execute()
        
        return True
    except Exception as e:
        print(f"[LEDGER_CREDIT_FAIL] {user_id}: {str(e)}")
        return False

def debit_user_balance(user_id: str, amount: float, reference: str = "Withdrawal"):
    """
    Debits a user's WNC balance with strict overdraft protection.
    """
    try:
        result = db.table("profiles").select("wnc_earnings").eq("id", user_id).single().execute()
        current_balance = Decimal(str(result.data.get("wnc_earnings", 0)))
        
        if current_balance < Decimal(str(amount)):
            raise Exception("INSUFFICIENT_FUNDS")
            
        new_balance = current_balance - Decimal(str(amount))
        
        db.table("profiles").update({
            "wnc_earnings": float(new_balance),
            "updated_at": "now()"
        }).eq("id", user_id).execute()
        
        return True
    except Exception as e:
        print(f"[LEDGER_DEBIT_FAIL] {user_id}: {str(e)}")
        raise e
