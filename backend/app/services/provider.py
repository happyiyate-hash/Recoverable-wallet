
import httpx
from app.config import PAYMENT_BASE_URL, PAYMENT_SECRET_KEY

headers = {
    "Authorization": f"Bearer {PAYMENT_SECRET_KEY}",
    "Content-Type": "application/json"
}

async def create_virtual_account(name: str, email: str):
    """
    Dispatches a handshake to the payment provider to provision a virtual account.
    """
    async with httpx.AsyncClient() as client:
        # Note: Replace endpoint with your actual provider (Flutterwave/Monnify) path
        r = await client.post(
            f"{PAYMENT_BASE_URL}/virtual-account/create",
            json={
                "name": name,
                "email": email
            },
            headers=headers
        )
        return r.json()

async def send_transfer(bank_code: str, account_number: str, amount: float, reference: str):
    """
    Initiates an outbound bank transfer payout.
    """
    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{PAYMENT_BASE_URL}/transfer",
            json={
                "bank_code": bank_code,
                "account_number": account_number,
                "amount": amount,
                "reference": reference
            },
            headers=headers
        )
        return r.json()
