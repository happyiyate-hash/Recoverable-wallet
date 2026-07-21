
from app.wallets.hd import derive_wallet
from app.ledger.balances import create_balance

def signup_user(user_id: str):
    """
    Called on Firebase Signup. Generates all custodial addresses for the user.
    """
    # Derive wallets for supported ecosystems
    eth_wallet = derive_wallet(user_id, "evm")
    btc_wallet = derive_wallet(user_id, "btc")
    sol_wallet = derive_wallet(user_id, "solana")
    
    # In a real app, these are saved to the 'wallets' table in the DB
    wallets = {
        "evm": eth_wallet["address"],
        "btc": btc_wallet["address"],
        "solana": sol_wallet["address"]
    }
    
    # Initialize internal ledger balances for major assets
    create_balance(user_id) 
    
    return {
        "user_id": user_id,
        "wallets": wallets,
        "status": "active"
    }
