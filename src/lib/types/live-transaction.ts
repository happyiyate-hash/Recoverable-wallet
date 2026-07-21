export interface LiveTransaction {
  txHash: string;
  chainId: number;
  walletAddress: string;
  direction: "incoming" | "outgoing";
  status:
    | "broadcasting"
    | "pending"
    | "confirming"
    | "confirmed"
    | "failed"
    | "dropped"
    | "replaced";
  tokenSymbol: string;
  tokenAddress?: string;
  amount: string;
  fromAddress: string;
  toAddress: string;
  gasFee?: string;
  blockNumber?: number;
  timestamp: number;
  confirmations: number;
}
