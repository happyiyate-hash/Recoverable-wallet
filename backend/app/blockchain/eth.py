from web3 import Web3
from app.wallets.hd import derive_eth_wallet
from app.config import ETH_RPC_URL
from app.ledger.balances import debit

w3 = Web3(Web3.HTTPProvider(ETH_RPC_URL))

def send_eth(user_id: str, to_address: str, amount: float):
    """
    Signs and broadcasts an ETH transfer using the user's derived key.
    """
    wallet = derive_eth_wallet(user_id)
    nonce = w3.eth.get_transaction_count(wallet["address"])

    tx = {
        "nonce": nonce,
        "to": to_address,
        "value": w3.to_wei(amount, "ether"),
        "gas": 21000,
        "gasPrice": w3.eth.gas_price,
        "chainId": 1 # Mainnet
    }

    signed_tx = w3.eth.account.sign_transaction(
        tx, private_key=wallet["private_key"]
    )

    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
    
    # Settlement: Deduct from internal ledger
    debit(user_id, "ETH", amount)
    
    return tx_hash.hex()