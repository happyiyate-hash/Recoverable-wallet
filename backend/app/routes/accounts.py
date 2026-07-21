
from fastapi import APIRouter, HTTPException
from app.models import CreateAccountRequest
from app.db import db
from app.services.provider import create_virtual_account

router = APIRouter(prefix="/accounts", tags=["accounts"])

@router.post("/create")
async def handle_create_account(payload: CreateAccountRequest):
    """
    Provision or retrieve a virtual bank account for an identity node.
    """
    user_result = db.table("profiles").select("*").eq(
        "id", payload.user_id
    ).single().execute()
    
    user = user_result.data
    if not user:
        raise HTTPException(404, "IDENTITY_NOT_FOUND")

    if user.get("virtual_account_number"):
        return {
            "success": True,
            "account_number": user["virtual_account_number"],
            "bank_name": user["virtual_bank_name"]
        }

    # Dispatch to Payment Provider
    try:
        result = await create_virtual_account(
            user["name"],
            user["email"]
        )

        # Synchronize Registry
        db.table("profiles").update({
            "virtual_account_number": result["account_number"],
            "virtual_bank_name": result["bank_name"]
        }).eq("id", payload.user_id).execute()

        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(500, f"PROVIDER_HANDSHAKE_FAILED: {str(e)}")
