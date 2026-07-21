import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@/contexts/wallet-provider';
import { useUser } from '@/contexts/user-provider';
import { useDebounce } from '@/hooks/use-debounce';
import { ethers } from 'ethers';
import { useToast } from '@/hooks/use-toast';
import type { AssetRow } from '@/lib/types';

import { getEvmQuotes } from '@/services/swaps/evm';
import { executeEvmSwap } from '@/services/swaps/evm/execute';
import { fetchTronQuote, executeTronSwap } from '@/services/swaps/tronSwap';
import { fetchLifiQuote } from '@/services/swaps/lifiSwap';
import { SwapService, SwapQuoteParams } from '@/services/swapService';

export function useSwapEngineV2() {
  const {
    wallets,
    allAssets,
    allChainsMap,
    prices,
    infuraApiKey,
    refresh,
  } = useWallet();

  const { user } = useUser();
  const { toast } = useToast();

  const [fromToken, setFromToken] = useState<AssetRow | null>(null);
  const [toToken, setToToken] = useState<AssetRow | null>(null);
  const [amount, setAmount] = useState('');
  const debouncedAmount = useDebounce(amount, 500);

  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);

  const swapService = new SwapService();

  // Fetch quote and check approval
  const prepareSwap = useCallback(async () => {
    if (!fromToken || !toToken || !debouncedAmount) return;
    setIsQuoteLoading(true);
    setFetchError(null);
    try {
      // Use existing getEvmQuotes for now (you could swap to swapService.getOptimizedRoute)
      const sellRaw = ethers.parseUnits(debouncedAmount, fromToken.decimals || 18).toString();
      const evmQuotes = await getEvmQuotes({
        chainId: fromToken.chainId!,
        fromToken: fromToken.isNative ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' : fromToken.address!,
        toToken: toToken.isNative ? '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' : toToken.address!,
        amount: sellRaw,
        user: wallets.find(w => w.type === 'evm')?.address || '',
        slippage: 0.5,
        toTokenDecimals: toToken.decimals || 18,
        toTokenPrice: 0,
        signal: undefined,
      });
      const best = evmQuotes?.[0];
      setSelectedQuote(best);

      // Check allowance using SwapService
      const rawAmount = sellRaw;
      const spender = best?.transaction?.to || '';
      const approvalNeeded = await swapService.checkNeedsApproval(
        fromToken.address,
        wallets.find(w => w.type === 'evm')?.address || '',
        spender,
        rawAmount,
        wallets.find(w => w.type === 'evm')?.provider || new ethers.providers.JsonRpcProvider()
      );
      setNeedsApproval(approvalNeeded);
    } catch (e: any) {
      setFetchError(e.message || 'Quote error');
    } finally {
      setIsQuoteLoading(false);
    }
  }, [fromToken, toToken, debouncedAmount, wallets, swapService]);

  useEffect(() => {
    const timer = setTimeout(() => {
      prepareSwap();
    }, 500);
    return () => clearTimeout(timer);
  }, [prepareSwap]);

  const executeApproval = async () => {
    if (!fromToken || !selectedQuote) return;
    try {
      const erc20 = new ethers.Interface(['function approve(address spender, uint256 amount) returns (bool)']);
      const rawAmount = ethers.parseUnits(amount, fromToken.decimals || 18);
      const data = erc20.encodeFunctionData('approve', [selectedQuote.transaction.to, rawAmount]);
      const wallet = wallets.find(w => w.type === 'evm')?.provider?.getSigner();
      const tx = await wallet?.sendTransaction({
        to: fromToken.address,
        data,
        value: 0,
      });
      await tx?.wait();
      setNeedsApproval(false);
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Approval failed', description: e.message });
    }
  };

  const executeSwap = async () => {
    if (!selectedQuote) return;
    setIsExecuting(true);
    try {
      // For simplicity, reuse existing executeEvmSwap with rawQuote
      await executeEvmSwap({
        rawQuote: selectedQuote.rawQuote,
        wallet: wallets.find(w => w.type === 'evm')?.provider?.getSigner(),
        setPhase: () => {},
      });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Swap failed', description: e.message });
    } finally {
      setIsExecuting(false);
    }
  };

  return {
    fromToken,
    setFromToken,
    toToken,
    setToToken,
    amount,
    setAmount,
    isQuoteLoading,
    selectedQuote,
    fetchError,
    needsApproval,
    executeApproval,
    executeSwap,
    isExecuting,
  };
}
