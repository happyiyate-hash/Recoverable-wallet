from app.ledger.balances import debit, credit

def execute_internal_swap(user_id: str, from_asset: str, to_asset: str, amount: float, rate: float):
    """
    Performs an instant off-chain swap within the internal ledger.
    """
    debit(user_id, from_asset, amount)
    credit(user_id, to_asset, amount * rate)
    
    return {
        "user_id": user_id,
        "from": from_asset,
        "to": to_asset,
        "amount": amount,
        "received": amount * rate
    }