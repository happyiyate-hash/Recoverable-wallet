'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/wallet-provider';
import { useUser } from '@/contexts/user-provider';
import { useDebounce } from '@/hooks/use-debounce';
import { ethers } from 'ethers';
import { useToast } from '@/hooks/use-toast';
import type { AssetRow } from '@/lib/types';
import { translateBlockchainError, logBlockchainError } from '@/lib/utils/blockchain-error-translator';

import { getEvmQuotes } from '@/services/swaps/evm';
import { executeEvmSwap } from '@/services/swaps/evm/execute';
import { fetchTronQuote, executeTronSwap } from '@/services/swaps/tronSwap';
import { fetchLifiQuote } from '@/services/swaps/lifiSwap';
import { SmartSwapEngine } from '@/services/smartSwapEngine';

type Provider = 'ONEINCH' | 'TRON' | 'LIFI';

interface SwapQuote {
  id: string;
  provider?: Provider;
  providerId?: string;
  providerName?: string;

  receiveAmount: number;
  toAmount?: string;

  gas?: string;
  gasUsd?: number;

  fee?: number;
  eta?: string;

  score: number;
  rawQuote: any;

  logo?: string;
  source?: string;

  expiresAt?: number;
}

const NATIVE = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

/**
 * INSTITUTIONAL SWAP DISCOVERY & EXECUTION ENGINE
 * Version: 2.1.2 (Professional Error Translation)
 */
export function useSwapEngine() {
  const {
    wallets,
    allAssets,
    allChainsMap,
    prices,
    infuraApiKey,
    refresh
  } = useWallet();

  const { user } = useUser();
  const { toast } = useToast();
  const router = useRouter();

  const [fromToken, setFromToken] = useState<AssetRow | null>(null);
  const [toToken, setToToken] = useState<AssetRow | null>(null);

  const [amount, setAmount] = useState('');
  const debouncedAmount = useDebounce(amount, 500);

  const [quotes, setQuotes] = useState<SwapQuote[]>([]);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);

  const [executionPhase, setExecutionPhase] = useState('IDLE');
  const [isExecuting, setIsExecuting] = useState(false);

  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [slippage, setSlippage] = useState(0.5);

  const [isSelectorOpen, setIsSelectorOpen] = useState(false);

  const [selectionType, setSelectionType] =
    useState<'from' | 'to'>('from');

  const quoteVersion = useRef(0);
  // Abort controller for cancelling stale quote requests
  const abortControllerRef = useRef<AbortController | null>(null);
  // Simple in‑memory cache for recent quotes (5 s default)
  const quoteCache = useRef(new Map<string, { data: SwapQuote[]; expires: number }>());

  const executionLock = useRef(false);

  // =========================================================
  // 🔥 FIXED: getPrice helper
  // =========================================================
  const getPrice = (token: AssetRow | null): number => {
    if (!token) return 0;

    try {
      // SYMBOL LOOKUP
      const symbolPrice =
        prices?.[token.symbol?.toUpperCase?.() || ''];

      if (typeof symbolPrice === 'number') {
        return symbolPrice;
      }

      // ADDRESS LOOKUP
      if (token.address) {
        const addressPrice =
          prices?.[token.address.toLowerCase()];

        if (typeof addressPrice === 'number') {
          return addressPrice;
        }
      }

      return 0;
    } catch {
      return 0;
    }
  };

  // =========================================================
  // 🔥 HELPER: determineSwapType
  // =========================================================
  const determineSwapType = (
    from: AssetRow,
    to: AssetRow
  ) => {
    const fromChain =
      from.chainId?.toString?.() || '';

    const toChain =
      to.chainId?.toString?.() || '';

    const fromIsTron =
      fromChain === 'tron' ||
      from.symbol?.toUpperCase() === 'TRX';

    const toIsTron =
      toChain === 'tron' ||
      to.symbol?.toUpperCase() === 'TRX';

    if (fromIsTron && toIsTron) {
      return 'SAME_CHAIN_TRON';
    }

    if (
      from.chainId &&
      to.chainId &&
      from.chainId === to.chainId
    ) {
      return 'SAME_CHAIN_EVM';
    }

    return 'CROSS_CHAIN';
  };

  // =========================================================
  // 🔥 HELPER: normalizeSwapError (Now uses professional translator)
  // =========================================================
  const normalizeSwapError = (err: any): string => {
    if (!err) return 'Unknown swap error';

    // Use the professional blockchain error translator
    const translated = translateBlockchainError(err);
    
    // Log the full error for debugging
    logBlockchainError(err, 'SWAP_ENGINE');

    // Return the user-friendly message
    return translated.message;
  };

  /**
   * CORE QUOTE DISCOVERY ENGINE
   */
  const getQuote = useCallback(async (
    from: AssetRow,
    to: AssetRow,
    amountVal: string,
    signal?: AbortSignal
  ): Promise<SwapQuote[]> => {
    try {
      const swapType = determineSwapType(from, to);

      if (!swapType) {
        throw new Error('Invalid swap route');
      }

      const fromP = getPrice(from);
      const toP = getPrice(to);

      const tradeValueUsd =
        parseFloat(amountVal || '0') * fromP;

      const userAddress =
        wallets.find(w => w.type === 'evm')?.address ||
        '0x0000000000000000000000000000000000000000';

      // =====================================================
      // 🟢 TRON
      // =====================================================
      if (swapType === 'SAME_CHAIN_TRON') {
        const res = await fetchTronQuote({
          amount: amountVal,
          fromToken: from,
          toToken: to,
          fromTokenPrice: fromP,
          toTokenPrice: toP,
          signal
        });

        if (!res) {
          throw new Error('TRON quote failed');
        }

        return [
          {
            id: 'tron',

            provider: 'TRON',
            providerId: 'TRON',
            providerName: 'SunSwap V2',

            logo: 'https://sunswap.com/logo.png',

            receiveAmount: Number(
              res.receiveAmount || 0
            ),

            toAmount: String(
              res.receiveAmount || 0
            ),

            gas: '0.1',
            gasUsd: 0.1,

            fee: 0.01,
            eta: '~5s',

            score:
              Number(res.receiveAmount || 0) * toP,

            rawQuote: res,

            source: 'SunSwap',

            expiresAt: Date.now() + 15000
          }
        ];
      }

      // =====================================================
      // 🔵 SAME CHAIN EVM
      // =====================================================
      if (swapType === 'SAME_CHAIN_EVM') {
        const sellRaw = ethers
          .parseUnits(
            amountVal,
            from.decimals || 18
          )
          .toString();

        console.log(
          `[SWAP_ENGINE] Discovery ${from.symbol} -> ${to.symbol}`
        );

        // Move this calculation outside the object
        const dynamicSlippage = SmartSwapEngine.calculateDynamicSlippage(from?.symbol ?? '', to?.symbol ?? '');

        const evmQuotes = await getEvmQuotes({
          chainId: from.chainId!,
          fromToken: from.isNative
            ? NATIVE
            : from.address!,

          toToken: to.isNative
            ? NATIVE
            : to.address!,

          amount: sellRaw,

          user: userAddress,

          dynamicSlippage,

          toTokenDecimals:
            to.decimals || 18,

          toTokenPrice: toP,
          signal
        });

        return (evmQuotes || []).map(
          (q: any, index: number) => ({
            ...q,

            id:
              q.id ||
              `evm-${index}`,

            expiresAt:
              q.expiresAt ||
              Date.now() + 15000
          })
        );
      }

      // =====================================================
      // 🟣 CROSS CHAIN
      // =====================================================
      if (swapType === 'CROSS_CHAIN') {
        const sellRaw = ethers
          .parseUnits(
            amountVal,
            from.decimals || 18
          )
          .toString();

        const res = await fetchLifiQuote({
          fromChain: from.chainId!,
          toChain: to.chainId!,

          fromToken: from.isNative
            ? NATIVE
            : from.address!,

          toToken: to.isNative
            ? NATIVE
            : to.address!,

          fromAmount: sellRaw,

          fromAddress: userAddress,

          toTokenPriceUsd: toP,

          tradeValueUsd,

          toTokenDecimals:
            to.decimals || 18,
          signal
        });

        return [
          {
            id: 'lifi',

            provider: 'LIFI',

            providerId: 'LIFI',

            providerName: 'LI.FI',

            logo: 'https://li.fi/logos/lifi.svg',

            receiveAmount: Number(
              res.receiveAmount || 0
            ),

            toAmount: String(
              res.receiveAmount || 0
            ),

            gas: '2.5',

            gasUsd:
              Number(res.feeUsd) || 2.5,

            fee: 0.01,

            eta: '~3m',

            score:
              Number(res.receiveAmount || 0) *
              toP,

            rawQuote: res.rawQuote,

            source: 'LI.FI',

            expiresAt: Date.now() + 15000
          }
        ];
      }

      return [];
    } catch (e: any) {
      console.error(
        '[QUOTE_ENGINE_ERROR]',
        e?.message
      );

      throw e;
    }
  }, [wallets, prices, slippage]);

  // =========================================================
  // 🔥 DISCOVERY EFFECT
  // =========================================================
  useEffect(() => {
    // Abort any in‑flight request before starting a new one
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    const run = async () => {
      const currentVersion = ++quoteVersion.current;
      setQuoteError(null);

      if (!fromToken || !toToken || !debouncedAmount) {
        setQuotes([]);
        setSelectedQuoteId(null);
        return;
      }

      // Build cache key based on tokens, chain IDs and amount
      const cacheKey = `${fromToken.address || fromToken.symbol}-${toToken.address || toToken.symbol}-${fromToken.chainId}-${toToken.chainId}-${debouncedAmount}`;
      const cached = quoteCache.current.get(cacheKey);
      const now = Date.now();
      if (cached && cached.expires > now) {
        // Use cached quotes (skip network call)
        setQuotes(cached.data);
        if (cached.data.length > 0) {
          setSelectedQuoteId(cached.data[0].id);
        }
        return;
      }

      try {
        const results = await getQuote(
          fromToken,
          toToken,
          debouncedAmount,
          signal // pass abort signal
        );

        if (quoteVersion.current !== currentVersion) {
          // Stale response, ignore
          return;
        }

        // Cache the fresh result for 10 seconds
        quoteCache.current.set(cacheKey, { data: results, expires: now + 10_000 });
        // After receiving raw quotes, apply priority sorting based on the source chain
        const sortedQuotes = sortQuotesByPriority(results, fromToken.chainId);
        setQuotes(sortedQuotes);
        if (sortedQuotes.length > 0) {
          setSelectedQuoteId(sortedQuotes[0].id);
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // Silently ignore aborted requests
          return;
        }
        setQuoteError(normalizeSwapError(err));
        setQuotes([]);
        setSelectedQuoteId(null);
      }
    };

    run();
  }, [debouncedAmount, fromToken, toToken, prices, slippage]);
  // =========================================================
  // 🔥 QUOTE EXPIRATION ENGINE
  // =========================================================
  useEffect(() => {
    const timer = setInterval(() => {
      const best = quotes.find(
        q => q.id === selectedQuoteId
      );

      if (
        best &&
        best.expiresAt &&
        best.expiresAt < Date.now() &&
        !isExecuting
      ) {
        console.log(
          `[SWAP_ENGINE] Route expired`
        );

        setQuotes([]);
        setSelectedQuoteId(null);
      }
    }, 1000);

    // Cleanup abort controller on component unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      clearInterval(timer);
    };
  }, [
    quotes,
    selectedQuoteId,
    isExecuting
  ]);

  // =========================================================
  // 🔥 EXECUTION GUARD
  // =========================================================
  const executeWithGuard = async (
    fn: () => Promise<any>
  ) => {
    if (executionLock.current) {
      throw new Error(
        'Execution locked'
      );
    }

    executionLock.current = true;

    try {
      return await Promise.race([
        fn(),

        new Promise((_, reject) =>
          setTimeout(() => {
            reject(
              new Error(
                'Swap timeout after 20 seconds'
              )
            );
          }, 20000)
        )
      ]);
    } finally {
      executionLock.current = false;
    }
  };

  // =========================================================
  // 🔥 TOKEN SELECTORS
  // =========================================================
  const handleOpenSelector = (
    type: 'from' | 'to'
  ) => {
    setSelectionType(type);
    setIsSelectorOpen(true);
  };

  const handleTokenSelect = (
    token: AssetRow
  ) => {
    if (selectionType === 'from') {
      setFromToken(token);
    } else {
      setToToken(token);
    }

    setQuotes([]);
    setSelectedQuoteId(null);
  };

  // =========================================================
  // 🔥 SWAP EXECUTION
  // =========================================================
  const handleFinalConfirm =
    async () => {
      if (
        !fromToken ||
        !toToken ||
        quotes.length === 0
      ) {
        return;
      }

      setIsExecuting(true);

      setExecutionPhase(
        'VERIFYING'
      );

      const validNow =
        quotes.filter(
          q =>
            !q.expiresAt ||
            q.expiresAt > Date.now()
        );

      if (validNow.length === 0) {
        toast({
          variant: 'destructive',

          title: 'Route Expired',

          description:
            'Liquidity window closed'
        });

        setQuotes([]);
        setSelectedQuoteId(null);

        setIsExecuting(false);

        return;
      }

      let success = false;
      let lastError = null;

      const startIndex =
        validNow.findIndex(
          q =>
            q.id ===
            selectedQuoteId
        );

      const sortedQuotes = [
        ...validQuotesToTry(
          validNow,
          startIndex
        )
      ];

      for (const quote of sortedQuotes) {
        try {
          setSelectedQuoteId(
            quote.id
          );

          await executeWithGuard(
            async () => {
              await executeSwapInternal(
                quote,
                amount,
                fromToken,
                toToken,
                setPhase => {
                  setExecutionPhase(
                    setPhase
                  );
                }
              );
            }
          );

          success = true;

          break;
        } catch (e: any) {
          lastError = e;

          console.warn(
            '[SWAP_FALLBACK]',
            e?.message
          );

          if (
            quote !==
            sortedQuotes[
              sortedQuotes.length - 1
            ]
          ) {
            setExecutionPhase(
              'REROUTING'
            );

            await new Promise(r =>
              setTimeout(r, 1000)
            );

            continue;
          }
        }
      }

      if (success) {
        setExecutionPhase(
          'SUCCESS'
        );

        toast({
          title:
            '✅ Swap Complete',

          description:
            'Settlement confirmed'
        });

        setTimeout(() => {
          setAmount('');

          setQuotes([]);

          setSelectedQuoteId(null);

          setExecutionPhase(
            'IDLE'
          );

          refresh();

          router.push('/');
        }, 1500);
      } else {
        setExecutionPhase(
          'FAILED'
        );

        // Use professional error translator here too
        const translated = translateBlockchainError(lastError);

        toast({
          variant: 'destructive',

          title: translated.title,

          description: translated.message
        });
      }

      setIsExecuting(false);
    };

  // =========================================================
  // 🔥 QUOTE ROTATION
  // =========================================================
  const validQuotesToTry = (
    qs: any[],
    start: number
  ) => {
    if (start === -1) {
      return qs;
    }

    return [
      ...qs.slice(start),
      ...qs.slice(0, start)
    ];
  };

  // =========================================================
  // 🔥 INTERNAL EXECUTION ROUTER
  // =========================================================
  const executeSwapInternal =
    async (
      quote: any,
      execAmount: string,
      fromTkn: AssetRow,
      toTkn: AssetRow,
      setPhaseCb: (
        p: string
      ) => void
    ) => {
      // Simple health tracking (placeholder). Increment failure count per provider.
      const healthMap = useRef(new Map<string, { failures: number; successes: number }>()).current;
      const updateHealth = (provider: string, success: boolean) => {
        const entry = healthMap.get(provider) || { failures: 0, successes: 0 };
        if (success) entry.successes++; else entry.failures++;
        healthMap.set(provider, entry);
      };
      // Example usage within execution loop (not fully integrated yet)
      // await executeWithGuard(...).catch(e => { updateHealth(quote.provider ?? 'unknown', false); throw e; });
      // On success: updateHealth(quote.provider ?? 'unknown', true);

        if (quote.source === 'SunSwap') {
        const wallet =
          wallets.find(
            w => w.type === 'tron'
          );

        if (!wallet?.privateKey) {
          throw new Error(
            'TRON private key missing'
          );
        }

        return await executeTronSwap({
          amount: execAmount,

          fromToken: fromTkn,

          toToken: toTkn,

          privateKey:
            wallet.privateKey,

          rpcUrl:
            allChainsMap['tron']
              ?.rpcUrl ||
            'https://api.trongrid.io',

          setPhase: setPhaseCb
        });
      }

      // 🔵 LI.FI
      if (quote.source === 'LI.FI') {
        const wallet =
          wallets.find(
            w => w.type === 'evm'
          );

        if (!wallet?.privateKey) {
          throw new Error(
            'EVM private key missing'
          );
        }

        const chain =
          allChainsMap[
            fromTkn.chainId!
          ];

        const provider =
          new ethers.JsonRpcProvider(
            chain.rpcUrl.replace(
              '{API_KEY}',
              infuraApiKey || ''
            )
          );

        const signer =
          new ethers.Wallet(
            wallet.privateKey,
            provider
          );

        const {
          executeLifiSwap
        } = await import(
          '@/services/swaps/lifiSwap'
        );

        return await executeLifiSwap({
          chainName:
            fromTkn.name,

          rawQuote:
            quote.rawQuote,

          wallet: signer,

          fromToken: fromTkn,

          amount: execAmount,

          setPhase:
            setPhaseCb
        });
      }

      // 🛡️ EVM
      const wallet =
        wallets.find(
          w => w.type === 'evm'
        );

      if (!wallet?.privateKey) {
        throw new Error(
          'EVM private key missing'
        );
      }

      const chain =
        allChainsMap[
          fromTkn.chainId!
        ];

      const provider =
        new ethers.JsonRpcProvider(
          chain.rpcUrl.replace(
            '{API_KEY}',
            infuraApiKey || ''
          )
        );

      const signer =
        new ethers.Wallet(
          wallet.privateKey,
          provider
        );

      return await executeEvmSwap({
        quote,

        wallet: signer,

        fromTokenAddress:
          fromTkn.isNative
            ? NATIVE
            : fromTkn.address!,

        amount: execAmount,

        setPhase: setPhaseCb,

        slippage
      });
    };

// Priority sorting for quotes based on provider and chain context
function sortQuotesByPriority(quotes: SwapQuote[], fromChainId: number): SwapQuote[] {
  // Define priority order: higher number = higher priority
  const priorityMap: { [key: string]: number } = {
    // EVM to EVM uses 0x
    ONEINCH: 5,
    "0x": 5,
    // EVM to non-EVM uses ThorChain
    THORCHAIN: 4,
    // Solana uses Jupiter
    JUPITER: 3,
    // TRX uses Tron provider
    TRON: 2,
    // Cross-chain fallback uses LI.FI
    LIFI: 1,
    // default low priority
    DEFAULT: 0,
  };
  return quotes.slice().sort((a, b) => {
    const aPri = priorityMap[(a.provider ?? "DEFAULT").toUpperCase()] ?? 0;
    const bPri = priorityMap[(b.provider ?? "DEFAULT").toUpperCase()] ?? 0;
    // higher priority first
    return bPri - aPri;
  });
}

  // =========================================================
  // 🔥 EXPOSED API
  // =========================================================
  return {
    fromToken,
    setFromToken,

    toToken,
    setToToken,

    amount,
    setAmount,

    quotes,

    selectedQuote:
      quotes.find(
        q =>
          q.id ===
          selectedQuoteId
      ) || null,

    isQuoteLoading:
      quoteVersion.current > 0 &&
      quotes.length === 0 &&
      !quoteError,

    quoteError,

    executionPhase,

    isExecuting,

    handleFinalConfirm,

    handleOpenSelector,

    handleTokenSelect,

    handleSwapTokens: () => {
      const prevFrom =
        fromToken;

      setFromToken(toToken);

      setToToken(prevFrom);

      setQuotes([]);

      setSelectedQuoteId(null);
    },

    slippage,
    setSlippage,

    isSelectorOpen,
    setIsSelectorOpen,

    selectionType,

    getQuote,

    executeSwap:
      executeSwapInternal,

    fromTokenPrice:
      getPrice(fromToken),

    toTokenPrice:
      getPrice(toToken)
  };
}
