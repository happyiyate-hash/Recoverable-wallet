
import httpx
from app.config import PAYMENT_BASE_URL, FLW_SECRET_KEY

headers = {
    "Authorization": f"Bearer {FLW_SECRET_KEY}",
    "Content-Type": "application/json"
}

async def create_virtual_account(email: str, name: str):
    """
    Provisions a dedicated Nigerian virtual account via Flutterwave.
    """
    payload = {
        "email": email,
        "is_permanent": True,
        "tx_ref": f"VA_{email.split('@')[0]}",
        "fullname": name
    }

    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{PAYMENT_BASE_URL}/virtual-account-numbers",
            json=payload,
            headers=headers
        )
        return r.json()

async def send_transfer(bank_code: str, account_number: str, amount: float, reference: str):
    """
    Dispatches a bank transfer payout via Flutterwave.
    """
    payload = {
        "account_bank": bank_code,
        "account_number": account_number,
        "amount": amount,
        "currency": "NGN",
        "reference": reference,
        "callback_url": "", # Optional webhook for transfer status
        "debit_currency": "NGN"
    }

    async with httpx.AsyncClient() as client:
        r = await client.post(
            f"{PAYMENT_BASE_URL}/transfers",
            json=payload,
            headers=headers
        )
        return r.json()
