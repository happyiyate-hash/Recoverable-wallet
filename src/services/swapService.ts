import { BigNumber, ethers } from 'ethers';

/**
 * Parameters required to request a swap quote from a DEX aggregator.
 */
export interface SwapQuoteParams {
  /** ERC‑20 address of the token being sold */
  sellTokenAddress: string;
  /** ERC‑20 address of the token being bought */
  buyTokenAddress: string;
  /** Amount to sell, expressed in base units (e.g., wei) */
  sellAmountRaw: string;
  /** Address of the user performing the swap */
  takerAddress: string;
  /** Desired slippage as a decimal (0.005 = 0.5 %) */
  slippagePercentage: number;
}

/**
 * Shape of the transaction object that the local signer expects.
 */
export interface ReadyTransactionRequest {
  /** Router contract address returned by the aggregator */
  to: string;
  /** Calldata (hex) that performs the swap */
  data: string;
  /** Native ETH value to attach (if any) */
  value: string;
  /** Gas limit estimate supplied by the aggregator */
  estimatedGas: string;
  /** Minimum amount of the buy token the user is willing to accept */
  minBuyAmount: string;
}

/**
 * Core service that talks to a DEX‑aggregator (0x in this example),
 * validates price impact, and checks token allowances.
 */
export class SwapService {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    // The ZeroX API key is optional for rate‑limited usage; fallback to empty string.
    this.apiKey = process.env.ZEROX_API_KEY ?? '';
    this.baseUrl = 'https://api.0x.org/swap/v2';
  }

  /**
   * 1️⃣ Market discovery – obtain a quote and translate it into a ready‑to‑sign transaction.
   */
  public async getOptimizedRoute(params: SwapQuoteParams): Promise<ReadyTransactionRequest> {
    try {
      const query = new URLSearchParams({
        sellToken: params.sellTokenAddress,
        buyToken: params.buyTokenAddress,
        sellAmount: params.sellAmountRaw,
        taker: params.takerAddress,
        slippagePercentage: params.slippagePercentage.toString(),
      });

      const response = await fetch(`${this.baseUrl}/quote?${query}`, {
        headers: { '0x-api-key': this.apiKey },
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.reason ?? 'Failed to fetch a valid route from the aggregator.');
      }

      const rawQuote = await response.json();

      // 2️⃣ Safety guard – abort on excessive price impact.
      this.validatePriceImpact(rawQuote.priceImpact);

      return {
        to: rawQuote.transaction.to,
        data: rawQuote.transaction.data,
        value: rawQuote.transaction.value || '0',
        estimatedGas: rawQuote.transaction.gas || '300000',
        minBuyAmount: rawQuote.minBuyAmount,
      };
    } catch (err: any) {
      console.error('[SwapService] getOptimizedRoute error:', err.message);
      throw err;
    }
  }

  /**
   * 2️⃣ Safety guard – enforce a maximum acceptable price‑impact percentage.
   */
  private validatePriceImpact(priceImpactPercent: string): void {
    const impact = parseFloat(priceImpactPercent ?? '0');
    const MAX_SAFE_IMPACT = 3.0; // percent
    if (impact > MAX_SAFE_IMPACT) {
      throw new Error(`High price impact (${impact}%). Swap aborted to protect the user.`);
    }
  }

  /**
   * 3️⃣ Security gate – checks whether an ERC‑20 allowance is sufficient.
   * Returns true if an approval transaction is required.
   */
  public async checkNeedsApproval(
    tokenAddress: string,
    userAddress: string,
    spenderAddress: string,
    requiredAmountRaw: string,
    provider: ethers.providers.Provider,
  ): Promise<boolean> {
    // Native ETH (or its universal placeholder) never needs allowance.
    if (tokenAddress.toLowerCase() === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      return false;
    }

    const erc20Abi = ['function allowance(address owner, address spender) view returns (uint256)'];
    const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);

    const allowance: BigNumber = await contract.allowance(userAddress, spenderAddress);
    const needed = BigNumber.from(requiredAmountRaw);
    return allowance.lt(needed);
  }
}
