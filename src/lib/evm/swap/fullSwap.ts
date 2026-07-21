import { ethers } from "ethers";

/**
 * INSTITUTIONAL FULL SWAP ENGINE (EVM)
 * Version: 1.1.0 (0x Protocol Orchestrator)
 * 
 * Orchestrates the full trade lifecycle:
 * 1. Quote Discovery (via Terminal Proxy)
 * 2. Token Approval (ERC20 only - Standard check)
 * 3. Atomic Execution (DEX Routing)
 * 
 * Result: User receives swapped tokens directly in their vault address.
 */
export async function fullSwap({
  signer,
  chainId,
  sellToken,
  buyToken,
  amount,
  decimals,
  slippage = 0.01
}: {
  signer: ethers.Signer;
  chainId: number;
  sellToken: string;
  buyToken: string;
  amount: number;
  decimals: number;
  slippage?: number;
}) {
  try {
    const userAddress = await signer.getAddress();

    // 1. Convert amount -> smallest unit (wei)
    const sellAmount = BigInt(Math.floor(amount * 10 ** decimals)).toString();

    // 2. Fetch Signed Quote via the terminal proxy node
    const params = new URLSearchParams({
      chainId: chainId.toString(),
      sellToken,
      buyToken,
      sellAmount,
      takerAddress: userAddress,
      slippagePercentage: slippage.toString(),
      mode: 'quote'
    });

    const response = await fetch(`/api/swap/0x-proxy?${params.toString()}`);
    const quote = await response.json();

    if (!response.ok || !quote || quote.code) {
      throw new Error(quote.reason || quote.message || "0x Node Handshake Failed");
    }

    // 3. Approval Protocol (Leg 1: ERC20 Only)
    // We check if the protocol has permission to spend the required token amount.
    const isNative = sellToken.toLowerCase() === 'eth' || sellToken === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';
    
    if (!isNative) {
      const tokenContract = new ethers.Contract(
        sellToken,
        [
          "function allowance(address owner, address spender) view returns (uint256)",
          "function approve(address spender, uint256 amount) external returns (bool)"
        ],
        signer
      );

      const allowance = await tokenContract.allowance(
        userAddress,
        quote.allowanceTarget
      );

      if (allowance < BigInt(sellAmount)) {
        console.log("[FULL_SWAP] Node: Authorizing token expenditure...");
        // Provision unlimited approval for institutional efficiency
        const approveTx = await tokenContract.approve(
          quote.allowanceTarget,
          ethers.MaxUint256 
        );
        await approveTx.wait();
        console.log("[FULL_SWAP] Node: Authorization verified.");
      }
    }

    // 4. Atomic Execution (Leg 2: DEX Broadcast)
    console.log("[FULL_SWAP] Node: Dispatching signed execution...");

    const tx = {
      to: quote.to,
      data: quote.data,
      value: quote.value,
      // Add buffer to 0x gas estimate for terminal reliability
      gasLimit: quote.gas ? BigInt(Math.floor(Number(quote.gas) * 1.2)) : undefined 
    };

    const txResponse = await signer.sendTransaction(tx);
    const receipt = await txResponse.wait();

    console.log("[FULL_SWAP] Node: Settlement complete.", receipt?.hash);

    return {
      success: true,
      txHash: receipt?.hash,
      buyAmount: quote.buyAmount
    };

  } catch (error: any) {
    console.error("[FULL_SWAP_FAIL]:", error.message);
    return {
      success: false,
      error: error.message
    };
  }
}
