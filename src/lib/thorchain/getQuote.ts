import axios from "axios";
import { thorchainAssets } from "./assets";

/**
 * THORCHAIN QUOTE DISCOVERY NODE
 * Version: 3.0.0 (Thornode Native Handshake)
 * 
 * Fetches the optimal cross-chain swap route from Thornode REST API.
 * CRITICAL: Enforces destination address and precision-safe amount formatting.
 */

interface QuoteRequest {
  fromAsset: string;
  toAsset: string;
  amount: string; // Human-readable amount
  destination: string;
}

export async function getThorQuote({ fromAsset, toAsset, amount, destination }: QuoteRequest) {
  try {
    const fromConfig = thorchainAssets[fromAsset.toUpperCase()];
    const toConfig = thorchainAssets[toAsset.toUpperCase()];

    if (!fromConfig || !toConfig) {
      throw new Error(`Unsupported cross-chain pair: ${fromAsset} -> ${toAsset}`);
    }

    if (!destination) {
      throw new Error(`Destination address node required for ${toAsset} delivery.`);
    }

    // Convert input amount to the smallest unit based on source chain decimals
    const fromAmountInUnits = Math.floor(parseFloat(amount) * Math.pow(10, fromConfig.decimals)).toString();

    // Thornode Quote API via high-speed NineRealms node
    const url = `https://thornode.ninerealms.com/thorchain/quote/swap`;
    
    const response = await axios.get(url, {
      params: {
        from_asset: fromConfig.identifier,
        to_asset: toConfig.identifier,
        amount: fromAmountInUnits,
        destination: destination,
        affiliate: "thor1609x25h2a535v6mqn0657v6as4h5666yv9gzhu", // NodeQuick Integrator
        affiliate_bps: 0 
      }
    });

    const data = response.data;

    // Handle Thornode-specific error objects
    if (data.error) {
      throw new Error(data.error);
    }

    if (!data.expected_amount_out) {
      throw new Error("No liquidity route found for this pair.");
    }

    // THORChain internal ledger uses 1e8 for native assets
    const receiveAmount = parseFloat(data.expected_amount_out) / 1e8;
    const feeInAsset = parseFloat(data.fees.total) / 1e8;

    return {
      fromAsset,
      toAsset,
      fromAmount: fromAmountInUnits,
      receiveAmount: receiveAmount,
      inboundAddress: data.inbound_address,
      memo: data.memo,
      feeUsd: feeInAsset * 25, // Rough USD estimation
      eta: "~10m",
      rawQuote: data
    };
  } catch (error: any) {
    const msg = error.response?.data?.error || error.message || "THORChain node handshake failed.";
    console.error("[THORCHAIN_QUOTE_FAIL]", msg);
    throw new Error(msg);
  }
}
