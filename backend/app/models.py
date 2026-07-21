
from pydantic import BaseModel
from typing import Optional

class CreateAccountRequest(BaseModel):
    user_id: str

class WithdrawRequest(BaseModel):
    user_id: str
    bank_code: str
    account_number: str
    amount: float
