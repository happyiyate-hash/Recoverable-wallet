
from eth_account import Account
import hashlib
from app.config import MASTER_SEED

# Enable HD features for Ethereum
Account.enable_unaudited_hdwallet_features()

def derive_wallet(user_id: str, chain_type: str = "evm"):
    """
    Derives multi-chain addresses from the master seed.
    """
    # Create a deterministic index from the user's UID
    index = int(hashlib.sha256(user_id.encode()).hexdigest(), 16) % 2147483647
    
    if chain_type == "evm":
        # Standard EVM derivation
        path = f"m/44'/60'/0'/0/{index}"
        acct = Account.from_mnemonic(MASTER_SEED, account_path=path)
        return {
            "address": acct.address,
            "private_key": acct.key.hex(),
            "path": path,
            "type": "evm"
        }
    elif chain_type == "btc":
        # Placeholder for BTC SegWit derivation
        # In production, use bitcoinlib or similar
        path = f"m/84'/0'/0'/0/{index}"
        return {
            "address": f"bc1q{hashlib.sha256(str(index).encode()).hexdigest()[:38]}",
            "path": path,
            "type": "btc"
        }
    elif chain_type == "solana":
        # Placeholder for Solana derivation
        path = f"m/44'/501'/{index}'/0'"
        return {
            "address": hashlib.sha256(str(index).encode()).hexdigest()[:44],
            "path": path,
            "type": "solana"
        }
    
    raise ValueError(f"Unsupported chain type: {chain_type}")
