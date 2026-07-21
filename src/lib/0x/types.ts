export interface SwapQuote {
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  buyAmount: string;
  data: string; // calldata for transaction
  gas: string;
  to: string;   // 0x contract address
  value?: string; // value for ETH swaps
}