from typing import Dict, Any, Optional
import uuid

class EventEngine:
    @staticmethod
    def _base_payload(payload_type: str, data: dict, title: str = "", message: str = "", priority: str = "NORMAL") -> dict:
        return {
            "version": 1,
            "eventId": f"evt_{uuid.uuid4().hex[:12]}",
            "type": payload_type,
            "title": title,
            "message": message,
            "priority": priority,
            "payload": data
        }

    @staticmethod
    def build_balance_updated_payload(chain: str, token_address: str, balance: str, block_number: int) -> dict:
        return EventEngine._base_payload("BALANCE_UPDATED", {
            "chain": chain,
            "tokenAddress": token_address,
            "balance": str(balance),
            "blockNumber": block_number
        })

    @staticmethod
    def build_tx_pending_payload(tx_hash: str, token: str, amount: str, direction: str, chain_id: int) -> dict:
        title = "Sending Asset" if direction == "outgoing" else "Incoming Asset"
        return EventEngine._base_payload("TX_PENDING", {
            "txHash": tx_hash,
            "symbol": token,
            "amount": str(amount),
            "direction": direction,
            "chainId": chain_id,
            "status": "pending"
        }, title=title, message=f"{amount} {token}")

    @staticmethod
    def build_tx_confirming_payload(tx_hash: str, confirmations: int, block_number: int, chain_id: int) -> dict:
        return EventEngine._base_payload("TX_CONFIRMING", {
            "txHash": tx_hash,
            "confirmations": confirmations,
            "blockNumber": block_number,
            "chainId": chain_id,
            "status": "confirming"
        }, title="Confirming", message=f"Waiting for {confirmations} confirmations...")

    @staticmethod
    def build_tx_confirmed_payload(tx_hash: str, block_number: int, chain_id: int) -> dict:
        return EventEngine._base_payload("TX_CONFIRMED", {
            "txHash": tx_hash,
            "blockNumber": block_number,
            "chainId": chain_id,
            "status": "confirmed"
        }, title="Transaction Confirmed", message="Successfully broadcasted to network.")

    @staticmethod
    def build_tx_failed_payload(tx_hash: str, reason: str, chain_id: int) -> dict:
        return EventEngine._base_payload("TX_FAILED", {
            "txHash": tx_hash,
            "reason": reason,
            "chainId": chain_id,
            "status": "failed"
        }, title="Transaction Failed", message=reason, priority="HIGH")

    @staticmethod
    def build_tx_replaced_payload(old_hash: str, new_hash: str, chain_id: int) -> dict:
        return EventEngine._base_payload("TX_REPLACED", {
            "oldTxHash": old_hash,
            "newTxHash": new_hash,
            "chainId": chain_id,
            "status": "replaced"
        }, title="Transaction Replaced", message="Accelerated with higher gas.")

    @staticmethod
    def build_security_alert_payload(tx_hash: str, warning_msg: str, risk_level: str) -> dict:
        return EventEngine._base_payload("SECURITY_ALERT", {
            "txHash": tx_hash,
            "message": warning_msg,
            "riskLevel": risk_level
        }, title="Security Alert", message=warning_msg, priority="CRITICAL")

    @staticmethod
    def build_swap_update_payload(swap_id: str, status: str, from_token: str, to_token: str, from_amount: str, to_amount: str, tx_hash: Optional[str] = None, chain_id: Optional[int] = None) -> dict:
        return EventEngine._base_payload("SWAP_UPDATE", {
            "swapId": swap_id,
            "status": status,
            "fromToken": from_token,
            "toToken": to_token,
            "fromAmount": from_amount,
            "toAmount": to_amount,
            "txHash": tx_hash,
            "chainId": chain_id
        }, title="Swap Executing", message=f"{from_amount} {from_token} → {to_amount} {to_token}")

    @staticmethod
    def build_approve_payload(tx_hash: str, token: str, spender: str, amount: str, chain_id: int) -> dict:
        return EventEngine._base_payload("APPROVE", {
            "txHash": tx_hash,
            "symbol": token,
            "spender": spender,
            "amount": amount,
            "chainId": chain_id,
            "status": "pending"
        }, title="Token Approval", message=f"Approving {token} for {spender}")

    @staticmethod
    def build_bridge_payload(tx_hash: str, from_chain: int, to_chain: int, token: str, amount: str) -> dict:
        return EventEngine._base_payload("BRIDGE", {
            "txHash": tx_hash,
            "fromChainId": from_chain,
            "toChainId": to_chain,
            "symbol": token,
            "amount": amount,
            "status": "pending"
        }, title="Cross-Chain Bridge", message=f"Moving {amount} {token} across networks")

event_engine = EventEngine()
