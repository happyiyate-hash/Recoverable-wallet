import { lifi } from "./config";

/**
 * LI.FI ROUTE DISCOVERY NODE
 * Version: 1.1.0 (Strict Identity Handshake)
 * 
 * Fetches the optimal cross-chain bridge and swap route.
 * Requires fromAddress to validate cross-chain delivery.
 */
export async function getQuote({
  fromChain,
  toChain,
  fromToken,
  toToken,
  amount,
  fromAddress
}: {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  amount: string;
  fromAddress: string;
}) {
  try {
    if (!fromAddress) throw new Error("Source identity node required for bridge discovery.");

    const routes = await lifi.getRoutes({
      fromChainId: fromChain,
      toChainId: toChain,
      fromTokenAddress: fromToken,
      toTokenAddress: toToken,
      fromAmount: amount,
      fromAddress: fromAddress,
      toAddress: fromAddress, // Funds delivered to same address on target chain
      options: {
        slippage: 0.01,
        allowSwitchChain: false 
      }
    });

    if (!routes.routes || routes.routes.length === 0) {
      throw new Error("No liquidity routes found for this bridge node.");
    }

    return routes.routes[0]; // Best performing route

  } catch (error: any) {
    console.error("[LIFI_QUOTE_FAIL]", error.message);
    throw error;
  }
}
