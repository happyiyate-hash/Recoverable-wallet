from typing import Dict, Any, Optional

class SecurityEngine:
    # Known dangerous selectors
    # 0x095ea7b3: approve(address,uint256)
    # 0xa22cb465: setApprovalForAll(address,bool)
    DANGEROUS_SELECTORS = {
        "0x095ea7b3": "approve",
        "0xa22cb465": "setApprovalForAll"
    }

    # Infinite approval signature parameter
    # ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff
    MAX_UINT_256 = "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"

    @classmethod
    def analyze_transaction(cls, tx_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Runs local heuristic analysis on an unconfirmed transaction.
        Returns a dictionary representing a SECURITY_ALERT if a risk is detected, else None.
        """
        # If this is a raw hex payload string
        input_data = tx_data.get("input", "") or tx_data.get("data", "")
        
        if not input_data or len(input_data) < 10:
            return None
            
        selector = input_data[:10].lower()
        
        # 1. Detect NFT setApprovalForAll
        if selector == "0xa22cb465":
            return {
                "type": "HIGH_RISK_APPROVAL",
                "priority": "CRITICAL",
                "title": "NFT Drainer Risk",
                "message": "A contract is requesting approval to drain all your NFTs in this collection.",
                "metadata": {
                    "spender": cls._extract_address(input_data),
                    "selector": "setApprovalForAll"
                }
            }

        # 2. Detect Unlimited Token Approval
        if selector == "0x095ea7b3":
            if cls.MAX_UINT_256 in input_data.lower():
                return {
                    "type": "HIGH_RISK_APPROVAL",
                    "priority": "CRITICAL",
                    "title": "Unlimited Approval Detected",
                    "message": "You are granting a contract permission to withdraw unlimited tokens from your wallet.",
                    "metadata": {
                        "spender": cls._extract_address(input_data),
                        "selector": "approve",
                        "amount": "Unlimited"
                    }
                }
                
        # 3. Contract Reputation Cache (Local Mock for Phase 3)
        to_address = tx_data.get("to", "").lower()
        if to_address in cls._mock_blacklist():
            return {
                "type": "DRAINER_RISK",
                "priority": "EMERGENCY",
                "title": "Malicious Contract Detected",
                "message": "This contract is flagged as a known scam/drainer.",
                "metadata": {
                    "contract": to_address
                }
            }
            
        return None

    @staticmethod
    def _extract_address(calldata: str) -> str:
        if len(calldata) >= 74:
            # 0x + 8 chars selector + 64 chars arg1
            return "0x" + calldata[34:74]
        return "Unknown"

    @staticmethod
    def _mock_blacklist():
        # A mock list of known bad addresses for demonstration
        return {
            "0xbad0000000000000000000000000000000000000",
            "0xscam000000000000000000000000000000000000"
        }

security_engine = SecurityEngine()
