from typing import Optional, Literal
from pydantic import BaseModel
import time

class LiveTransaction(BaseModel):
    txHash: str
    chainId: int
    walletAddress: str
    
    direction: Literal["incoming", "outgoing"]
    
    status: Literal[
        "broadcasting", 
        "pending", 
        "confirming", 
        "confirmed", 
        "failed", 
        "dropped", 
        "replaced"
    ]
    
    tokenSymbol: str
    tokenAddress: Optional[str] = None
    
    amount: str
    fromAddress: str
    toAddress: str
    
    gasFee: Optional[str] = None
    blockNumber: Optional[int] = None
    
    timestamp: int = int(time.time())
    confirmations: int = 0
