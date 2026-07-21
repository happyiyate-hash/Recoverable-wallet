'use client';

import { ethers } from 'ethers';
import type { AssetRow } from '@/lib/types';

const NATIVE = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

/**
 * 1INCH AGGREGATOR ENGINE (PRODUCTION READY)
 * Version: 3.0.0 (Proxy + Approval Standard)
 */
export async function fetchOneInchQuote(params: {
  chainId: number;
  sellToken: string;
  buyToken: string;
  sellAmount: string;
  toTokenDecimals: number;
  ethPrice: number;
}) {
  try {
    const res = await fetch(
      `/api/1inch/quote?` +
        new URLSearchParams({
          chainId: params.chainId.toString(),
          src: params.sellToken,
          dst: params.buyToken,
          amount: params.sellAmount
        })
    );

    const data = await res.json();

    if (!res.ok || !data?.toAmount) {
      throw new Error(data?.description || '1inch quote failed');
    }

    // ✅ SAFE GAS ESTIMATION
    // 1inch returns gas as units, we multiply by gasPrice to get native cost
    const gas = BigInt(data.estimatedGas || 200000);
    const gasPrice = BigInt(data.gasPrice || 20000000000); // fallback 20 gwei

    const gasUsd =
      Number(ethers.formatEther(gas * gasPrice)) * params.ethPrice;

    return {
      receiveAmount: parseFloat(
        ethers.formatUnits(data.toAmount, params.toTokenDecimals)
      ),
      feeUsd: 0,
      gasUsd,
      rawQuote: data
    };
  } catch (e: any) {
    console.warn('[1INCH_QUOTE_FAIL]', e.message);
    return null;
  }
}

/**
 * EXECUTE SWAP
 * Orchestrates: Verify -> Approve -> Send -> Settle
 */
export async function executeOneInchSwap(params: {
  wallet: ethers.Wallet;
  fromToken: AssetRow;
  toToken: AssetRow;
  amount: string;
  setPhase: (p: any) => void;
}) {
  const { wallet, fromToken, toToken, amount, setPhase } = params;

  try {
    // ✅ 1. FETCH TX DATA FROM BACKEND PROXY
    setPhase('VERIFYING');

    const res = await fetch(
      `/api/1inch/swap?` +
        new URLSearchParams({
          chainId: fromToken.chainId.toString(),
          src: fromToken.isNative ? NATIVE : fromToken.address,
          dst: toToken.isNative ? NATIVE : toToken.address,
          amount: ethers
            .parseUnits(amount, fromToken.decimals || 18)
            .toString(),
          from: wallet.address,
          slippage: '0.5' // Institutional standard 0.5%
        })
    );

    const data = await res.json();

    if (!res.ok || !data?.tx) {
      throw new Error(data?.description || 'Invalid 1inch swap payload');
    }

    // ✅ 2. APPROVAL HANDSHAKE (ONLY IF ERC20)
    if (!fromToken.isNative) {
      setPhase('APPROVING');

      const erc20 = new ethers.Contract(
        fromToken.address,
        ['function allowance(address owner, address spender) view returns (uint256)', 'function approve(address spender, uint256 amount) external returns (bool)'],
        wallet
      );

      // Audit current allowance
      const currentAllowance = await erc20.allowance(wallet.address, data.tx.to);
      const amountBN = ethers.parseUnits(amount, fromToken.decimals || 18);

      if (currentAllowance < amountBN) {
        const MAX = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
        const approveTx = await erc20.approve(data.tx.to, MAX);
        await approveTx.wait();
      }
    }

    // ✅ 3. BROADCAST SIGNED TRANSACTION
    setPhase('SENDING');

    const tx = await wallet.sendTransaction({
      to: data.tx.to,
      data: data.tx.data,
      value: data.tx.value ? BigInt(data.tx.value) : 0n,
      // Apply institutional 20% gas buffer for reliability
      gasLimit: data.tx.gas
        ? BigInt(Math.floor(Number(data.tx.gas) * 1.2))
        : undefined
    });

    // ✅ 4. WAIT FOR SETTLEMENT
    setPhase('SETTLING');

    const receipt = await tx.wait();

    return receipt;
  } catch (e: any) {
    console.error('[1INCH_EXEC_FAIL]', e.message);
    throw e;
  }
}
