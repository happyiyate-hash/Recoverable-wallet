import { ProviderId } from "./types";
import { ethers } from "ethers";
import { buildTransaction } from "./buildTx";
import { approveToken } from "./approve";

export interface ExecuteEvmParams {
  quote: any;         // The full bestQuote object (containing provider and tx)
  wallet: ethers.Wallet | ethers.Signer;
  fromTokenAddress: string;
  amount: string;
  setPhase: (phase: string) => void;
  slippage?: number;  // Slippage percentage (e.g., 0.5 for 0.5%)
}

/**
 * Executes a dry-run of the transaction locally on the RPC node.
 * This ensures the swap will not fail before we commit real gas.
 */
export async function simulateSwap(txData: any, signer: ethers.Signer) {
  try {
    const result = await signer.call({
      to: txData.to,
      data: txData.data,
      value: txData.value || "0",
    });

    console.log("[SIMULATION] ✅ Simulation success:", result);
    return { success: true, result };

  } catch (error: any) {
    console.error("[SIMULATION] ❌ Simulation failed:", error);

    return {
      success: false,
      error: error.reason || error.message || "Unknown execution revert",
    };
  }
}

export async function executeEvmSwap({
  quote,
  wallet,
  fromTokenAddress,
  amount,
  setPhase,
  slippage = 0.5
}: ExecuteEvmParams) {
  
  const userAddress = await wallet.getAddress();

  // 1. Resolve Spender (SINGLE SOURCE OF TRUTH)
  const spender = quote.allowanceTarget;
  const pId = quote.providerId as ProviderId;

  console.log(`[EVM_EXEC] Handshake sequence initiated: ${pId}`);

  // 2. Optimized Approval Node
  if (spender) {
      console.log(`[EVM_EXEC] Verified Spender Node: ${spender}`);
      
      // CHECK ALLOWANCE (Approval Optimization)
      const tokenContract = new ethers.Contract(
        fromTokenAddress,
        ["function allowance(address,address) view returns (uint256)"],
        wallet
      );
      
      const currentAllowance = await tokenContract.allowance(userAddress, spender);
      const requiredAmount = BigInt(amount);

      if (currentAllowance < requiredAmount) {
          console.log(`[EVM_EXEC] Approval required: ${currentAllowance.toString()} < ${requiredAmount.toString()}`);
          await approveToken(fromTokenAddress, spender, amount, wallet, setPhase);
      } else {
          console.log(`[EVM_EXEC] Approval Optimized: Sufficient allowance already exists (${currentAllowance.toString()})`);
      }
  } else {
      console.warn(`[EVM_EXEC] No spender detected for ${pId}, assuming native or pre-approved.`);
  }

  // 3. Build Transaction Payload (SINGLE SOURCE OF TRUTH)
  setPhase('VERIFYING');
  const txData = await buildTransaction(quote, userAddress);

  // 4. Simulation Guard (Pre-broadcast Verification)
  setPhase('SIMULATING');
  console.log(`[EVM_EXEC] Simulating transaction payload...`);
  const simulation = await simulateSwap(txData, wallet);

  if (!simulation.success) {
    throw new Error(`Simulation Reverted: ${simulation.error}`);
  }

  // 5. Gas Estimation Node
  if (!txData.gasLimit) {
      try {
          const estimatedGas = await wallet.estimateGas({
            to: txData.to,
            data: txData.data,
            value: txData.value || "0",
          });
          const g = BigInt(estimatedGas);
          txData.gasLimit = (g * 120n) / 100n; // 20% Buffer for volatility
      } catch (gasError) {
          console.warn("[GAS_ESTIMATE] Fallback triggered.", gasError);
          txData.gasLimit = 350000n; // Conservative default
      }
  }

  // 6. Final Broadcast Execution
  setPhase('SENDING');
  console.log(`[EVM_EXEC] Execution verified. Broadcasting to network...`);
  
  const tx = await wallet.sendTransaction({
    to: txData.to,
    data: txData.data,
    value: txData.value || "0",
    gasLimit: txData.gasLimit,
  });

  setPhase('SETTLING');
  console.log(`[EVM_EXEC] Waiting for confirmation (Hash: ${tx.hash})`);
  
  const receipt = await tx.wait();
  console.log(`[EVM_EXEC] Settlement complete!`, receipt);
  
  return receipt;
}
