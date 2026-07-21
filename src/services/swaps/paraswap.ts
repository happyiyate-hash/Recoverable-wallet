'use client';

import { ethers } from 'ethers';
import type { AssetRow } from '@/lib/types';

/**
 * PARASWAP AGGREGATOR ENGINE (PRO VERSION)
 * Version: 2.0.0 (Proxy + Max Approval Standard)
 */
export async function fetchParaSwapQuote(params: {
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  userAddress: string;
  toTokenDecimals: number;
  ethPrice: number;
}) {
  try {
    const res = await fetch(
      `/api/paraswap/quote?` +
        new URLSearchParams({
          chainId: params.chainId.toString(),
          srcToken: params.sellToken,
          destToken: params.buyToken,
          amount: params.sellAmount,
          userAddress: params.userAddress
        })
    );

    const data = await res.json();

    if (!res.ok || !data?.priceRoute?.destAmount) {
      throw new Error('ParaSwap route discovery failed');
    }

    // ✅ DYNAMIC GAS AUDIT
    const gasUnits = BigInt(data.tx?.gas || 200000);
    const gasPrice = BigInt(data.tx?.gasPrice || 20000000000);
    const gasUsd = Number(ethers.formatEther(gasUnits * gasPrice)) * params.ethPrice;

    return {
      receiveAmount: parseFloat(
        ethers.formatUnits(
          data.priceRoute.destAmount,
          params.toTokenDecimals
        )
      ),
      feeUsd: 0, 
      gasUsd,
      rawQuote: data.tx
    };
  } catch (e: any) {
    console.warn('[PARASWAP_QUOTE_FAIL]', e.message);
    return null;
  }
}

/**
 * ATOMIC EXECUTION NODE
 */
export async function executeParaSwap(params: {
  rawQuote: any;
  wallet: ethers.Wallet;
  fromToken: AssetRow;
  amount: string;
  setPhase: (p: any) => void;
}) {
  const { rawQuote, wallet, fromToken, amount, setPhase } = params;

  try {
    if (!rawQuote?.to || !rawQuote?.data) {
      throw new Error('Invalid ParaSwap transaction node');
    }

    // ✅ AUTHORIZATION GATING
    if (!fromToken.isNative) {
      setPhase('APPROVING');

      const erc20 = new ethers.Contract(
        fromToken.address,
        [
          'function approve(address spender, uint256 amount) external returns (bool)',
          'function allowance(address owner, address spender) view returns (uint256)'
        ],
        wallet
      );

      const decimals = Number(fromToken.decimals ?? 18);
      const amountBN = ethers.parseUnits(amount, decimals);
      const allowance = await erc20.allowance(wallet.address, rawQuote.to);

      if (allowance < amountBN) {
        // Institutional Standard: Max Approval to prevent future friction
        const approveTx = await erc20.approve(rawQuote.to, ethers.MaxUint256);
        await approveTx.wait();
      }
    }

    // ✅ BROADCAST SIGNED PAYLOAD
    setPhase('SENDING');

    const tx = await wallet.sendTransaction({
      to: rawQuote.to,
      data: rawQuote.data,
      value: rawQuote.value ? BigInt(rawQuote.value) : 0n,
      gasLimit: rawQuote.gas
        ? BigInt(Math.floor(Number(rawQuote.gas) * 1.2)) // 20% Safety Buffer
        : undefined
    });

    setPhase('SETTLING');
    return await tx.wait();

  } catch (e: any) {
    console.error('[PARASWAP_EXEC_FAIL]', e.message);
    throw e;
  }
}
