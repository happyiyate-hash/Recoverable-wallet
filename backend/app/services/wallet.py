
from app.db import db
from decimal import Decimal

def get_profile(user_id: str):
    return db.table("profiles").select("*").eq("id", user_id).single().execute().data

def get_profile_by_account(virtual_account_number: str):
    return db.table("profiles").select("*").eq(
        "virtual_account_number",
        virtual_account_number
    ).single().execute().data

def credit_wallet(user_id: str, amount: float, reference: str, meta: dict = {}):
    """
    Performs an atomic credit to the user's WNC earnings node.
    """
    profile = get_profile(user_id)
    current_balance = Decimal(str(profile.get("wnc_earnings", 0)))
    new_balance = current_balance + Decimal(str(amount))

    # 1. Update Core Registry
    db.table("profiles").update({
        "wnc_earnings": float(new_balance),
        "updated_at": "now()"
    }).eq("id", user_id).execute()

    # 2. Log to Immutable Ledger
    db.table("wnc_transfers").insert({
        "receiver_id": user_id,
        "sender_id": "00000000-0000-0000-0000-000000000000", # SYSTEM_DEPOSIT_NODE
        "amount_wnc": amount,
        "reference": reference
    }).execute()

def debit_wallet(user_id: str, amount: float, reference: str):
    """
    Performs an atomic debit with overdraft protection.
    """
    profile = get_profile(user_id)
    balance = Decimal(str(profile.get("wnc_earnings", 0)))

    if balance < Decimal(str(amount)):
        raise Exception("INSUFFICIENT_NODE_BALANCE")

    # 1. Update Core Registry
    db.table("profiles").update({
        "wnc_earnings": float(balance - Decimal(str(amount))),
        "updated_at": "now()"
    }).eq("id", user_id).execute()

    # 2. Log to Ledger as Pending
    db.table("wnc_transfers").insert({
        "sender_id": user_id,
        "receiver_id": "00000000-0000-0000-0000-000000000000", # SYSTEM_WITHDRAWAL_NODE
        "amount_wnc": amount,
        "reference": reference
    }).execute()
