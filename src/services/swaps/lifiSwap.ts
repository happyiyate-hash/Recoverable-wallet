
'use client';

/**
 * LI.FI BRIDGE & SWAP ENGINE
 * Version: 3.1.0 (1% Platform Fee & Route Validation)
 * Handles cross-chain EVM routing and bridging with platform fee capturing.
 */

import { ethers } from 'ethers';
import { getFeeRecipient } from '@/lib/wallets/services/fee-recipients';

export async function fetchLifiQuote(params: {
  fromChain: number;
  toChain: number;
  fromToken: string;
  toToken: string;
  fromAmount: string; // Raw Units (Wei)
  fromAddress: string;
  toTokenPriceUsd: number;
  tradeValueUsd: number;
  toTokenDecimals: number;
}) {
  // 1. CALCULATE 1% PLATFORM FEE (Model A)
  const totalAmountBN = BigInt(params.fromAmount);
  const platformFeeRaw = totalAmountBN / 100n;
  const swapAmountRaw = totalAmountBN - platformFeeRaw;

  const query = new URLSearchParams({
    fromChain: params.fromChain.toString(),
    toChain: params.toChain.toString(),
    fromToken: params.fromToken,
    toToken: params.toToken,
    fromAmount: swapAmountRaw.toString(),
    fromAddress: params.fromAddress,
    slippage: '0.005'
  });

  const res = await fetch(`/api/bridge/quote?${query.toString()}`);
  
  if (!res.ok) {
    const err = await res.json();
    // DETECT NO ROUTE CASE
    if (res.status === 404 || err.details?.toLowerCase().includes('no route') || err.error?.toLowerCase().includes('no route')) {
      throw new Error("No bridge route available for this pair");
    }
    throw new Error(err.details || err.error || "Bridge Protocol Failed.");
  }
  
  const q = await res.json();

  if (!q || !q.estimate) {
    throw new Error("No bridge route available for this pair");
  }

  const platformFeeUsd = params.tradeValueUsd * 0.01;
  const rawReceive = parseFloat(ethers.formatUnits(q.estimate.toAmount, params.toTokenDecimals));

  return {
    receiveAmount: Math.max(0, rawReceive),
    feeUsd: parseFloat(q.estimate.feeCosts?.[0]?.amountUsd || '2.00') + 0.10 + platformFeeUsd,
    platformFeeUsd,
    rawQuote: q
  };
}

export async function executeLifiSwap(params: {
  chainName: string;
  rawQuote: any;
  wallet: ethers.Wallet;
  fromToken: any;
  amount: string;
  setPhase: (phase: any) => void;
}) {
  const { chainName, rawQuote, wallet, fromToken, amount, setPhase } = params;

  try {
    setPhase('LIQUIDITY');
    const decimals = fromToken.decimals || 18;
    const totalAmountRaw = ethers.parseUnits(amount, decimals);
    
    // 1. SETTLE 1% PLATFORM FEE (LEG 1)
    const platformFeeRaw = totalAmountRaw / 100n;
    const feeRecipient = getFeeRecipient(chainName);

    if (fromToken.isNative || fromToken.address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee') {
      const feeTx = await wallet.sendTransaction({ 
        to: feeRecipient, 
        value: platformFeeRaw 
      });
      await feeTx.wait();
    } else {
      const tokenContract = new ethers.Contract(
        fromToken.address, 
        ["function transfer(address to, uint256 amount) returns (bool)"], 
        wallet
      );
      const feeTx = await tokenContract.transfer(feeRecipient, platformFeeRaw);
      await feeTx.wait();
    }

    // 2. EXECUTE BRIDGE (LEG 2)
    const q = rawQuote;
    if (!q.transactionRequest) throw new Error("Invalid LI.FI transaction request.");

    setPhase('APPROVING');
    const approvalAddress = q.estimate.approvalAddress;
    if (approvalAddress && !fromToken.isNative) {
      const tokenContract = new ethers.Contract(
        fromToken.address,
        ["function allowance(address owner, address spender) view returns (uint256)", "function approve(address spender, uint256 amount) returns (bool)"],
        wallet
      );
      const allowance = await tokenContract.allowance(wallet.address, approvalAddress);
      const requiredAmount = totalAmountRaw - platformFeeRaw;
      
      if (allowance < requiredAmount) {
        const approveTx = await tokenContract.approve(approvalAddress, ethers.MaxUint256);
        await approveTx.wait();
      }
    }

    setPhase('SENDING');
    const tx = await wallet.sendTransaction({
      to: q.transactionRequest.to,
      data: q.transactionRequest.data,
      value: q.transactionRequest.value,
      gasLimit: q.transactionRequest.gasLimit
    });

    return tx;
  } catch (error: any) {
    console.error("[LIFI_EXECUTION_FAIL]", error.message);
    throw error;
  }
}
