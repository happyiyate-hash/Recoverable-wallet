'use client';

import { Suspense, useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/wallet-provider';
import { useCurrency } from '@/contexts/currency-provider';
import { gasService } from '@/services/gasService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, 
  Loader2, 
  Fuel,
  ShieldCheck,
  Search,
  ArrowRight,
  ShieldAlert,
  AlertCircle,
  Zap,
  QrCode,
  X,
  ImageIcon,
  Repeat,
  ChevronDown,
  Crown,
  ShieldOff,
  Lock,
  Users,
  Clock,
  Check
} from 'lucide-react';
import TokenLogoDynamic from '@/components/shared/TokenLogoDynamic';
import { useToast } from '@/hooks/use-toast';
import type { AssetRow } from '@/lib/types';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase/client';
import { useDebounce } from '@/hooks/use-debounce';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUser } from '@/contexts/user-provider';
import TransactionConfirmationSheet from '@/components/wallet/transaction-confirmation-sheet';
import TransactionStatusCard from '@/components/wallet/transaction-status-card';
import TransactionReceiptSheet from '@/components/wallet/transaction-receipt-sheet';
import GlobalTokenSelector from '@/components/shared/global-token-selector';
import { motion, AnimatePresence } from 'framer-motion';
import { Html5Qrcode } from 'html5-qrcode';
import Link from 'next/link';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { getAddressForChain, validateAddressForChain } from '@/lib/wallets/utils';

// IMPORTING LOGIC FROM SHARED LAYER
import { 
  detectAddressType, 
  getDetectedNetworkMeta, 
  mapTechnicalError, 
  performTransactionDispatch,
  parseBlockchainUri
} from '@/components/wallet/send/WalletComponents';

const SESSION_STORAGE_KEY = 'draft_session_/send';
const normalizeAddress = (address: string) => address?.trim().toLowerCase() || '';

/**
 * INSTITUTIONAL SEND TERMINAL
 * Version: 16.1.1 (Surgical Verification Lock)
 */
function SendClient() {
  const { 
    viewingNetwork, 
    wallets, 
    infuraApiKey, 
    allAssets, 
    prices, 
    allChainsMap = {}, 
    refresh, 
    setActiveFulfillmentId,
    accountNumber 
  } = useWallet();
  
  const { formatFiat, rates, selectedCurrency } = useCurrency();
  const { profile, isPremium, refreshProfile } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isStatusVisible, setIsStatusVisible] = useState(false);
  const [txStatus, setTxStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptError, setReceiptError] = useState('');

  const [selectedToken, setSelectedToken] = useState<AssetRow | null>(null);
  const [recipientInput, setRecipientInput] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [recipientProfile, setRecipientProfile] = useState<{id: string, avatar: string, verified: boolean, name: string} | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const debouncedRecipient = useDebounce(recipientInput, 300);

  const [amount, setAmount] = useState('');
  const [inputType, setInputType] = useState<'token' | 'fiat'>('token');
  const [displayAmount, setDisplayAmount] = useState('');

  const [totalFeeUsd, setTotalFeeUsd] = useState(0.05);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [txHash, setTxHash] = useState('');

  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isRecentOpen, setIsRecentOpen] = useState(false);
  const [recentRecipients, setRecentRecipients] = useState<any[]>([]);
  const [isRecentLoading, setIsRecentLoading] = useState(false);

  const hasInitialized = useRef(false);
  const resolutionCounter = useRef(0);
  const verificationCache = useRef<Map<string, any>>(new Map());
  const lastVerifiedKey = useRef<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // COMPLIANCE SENTINELS
  const isAccountProtected = profile?.is_disabled || profile?.security_locked;
  const isWnc = selectedToken?.symbol === 'WNC';

  // 1. ASSET METADATA
  const activeNetwork = useMemo(() => {
    if (selectedToken?.symbol === 'WNC') return { name: 'Wevina Internal', symbol: 'WNC', type: 'internal', chainId: 0 } as any;
    const chainId = selectedToken?.chainId ?? 1;
    const resolved = (allChainsMap && allChainsMap[chainId]) ? allChainsMap[chainId] : viewingNetwork;
    return resolved || { name: 'Ethereum', symbol: 'ETH', chainId: 1, type: 'evm' };
  }, [selectedToken, viewingNetwork, allChainsMap]);

  // 🛡️ SAFETY SENTINEL: Derived Address Validity
  const fromAddressForChain = useMemo(() => {
    if (!wallets || !activeNetwork) return null;
    return getAddressForChain(activeNetwork, wallets);
  }, [wallets, activeNetwork]);

  const isFromAddressValid = useMemo(() => {
    if (isWnc) return true;
    if (!fromAddressForChain) return false;
    return validateAddressForChain(fromAddressForChain, activeNetwork);
  }, [fromAddressForChain, activeNetwork, isWnc]);

  // 📥 SESSION RESTORATION NODE
  useEffect(() => {
    if (allAssets.length > 0 && !hasInitialized.current) {
        const saved = localStorage.getItem(SESSION_STORAGE_KEY);
        if (saved) {
            try {
                const draft = JSON.parse(saved);
                const token = allAssets.find(a => a.symbol === draft.symbol && a.chainId === draft.chainId);
                if (token) {
                    setSelectedToken(token);
                    setRecipientInput(draft.recipient || '');
                    setAmount(draft.amount || '');
                    setDisplayAmount(draft.amount || '');
                }
            } catch (e) {
                console.warn("[SESSION_REGISTRY] Stale node purged.");
            }
        }
    }
  }, [allAssets]);

  // 📤 SESSION PERSISTENCE NODE
  useEffect(() => {
    if (selectedToken && (recipientInput || amount)) {
        const draft = {
            symbol: selectedToken.symbol,
            chainId: selectedToken.chainId,
            recipient: recipientInput,
            amount: amount,
            updatedAt: Date.now()
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(draft));
    }
  }, [selectedToken, recipientInput, amount]);

  const fetchRecent = useCallback(async () => {
    if (!supabase || !profile?.id) return;
    setIsRecentLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_recent_recipients');
      if (!error && data) {
          const filtered = data.filter((r: any) => 
            r.name?.toUpperCase() !== 'ADMIN' && 
            r.name?.toUpperCase() !== 'ADMINISTRATOR' &&
            r.id !== '00000000-0000-0000-0000-000000000000'
          );
          setRecentRecipients(filtered);
      }
    } catch (e) {
      console.error("[RECENT_FETCH_FAIL]", e);
    } finally {
      setIsRecentLoading(false);
    }
  }, [profile?.id]);

  useEffect(() => {
    if (isRecentOpen) fetchRecent();
  }, [isRecentOpen, fetchRecent]);

  const handleSelectRecent = (recipient: any) => {
    const target = recipient.account_number || recipient.evm_address || recipient.solana_address;
    if (target) {
      setRecipientInput(target);
      handleRecipientInputChange(target);
      setIsRecentOpen(false);
    }
  };

  const [, setGasUpdate] = useState(0);
  useEffect(() => {
    if (allChainsMap) {
      gasService.startGasUpdater(Object.values(allChainsMap), infuraApiKey);
    }
    return gasService.subscribe(() => {
      setGasUpdate(prev => prev + 1);
    });
  }, [allChainsMap, infuraApiKey]);

  const gasDataFromService = gasService.getGasPrice(activeNetwork?.name || '');

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    if (isScannerOpen) {
      const timer = setTimeout(async () => {
        try {
          const element = document.getElementById("reader");
          if (!element) return;

          html5QrCode = new Html5Qrcode("reader");
          const config = { fps: 10, qrbox: { width: 250, height: 250 } };

          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText) => {
              if (processTransactionIntent(decodedText)) {
                setIsScannerOpen(false);
                if (html5QrCode && html5QrCode.isScanning) {
                  html5QrCode.stop().catch(() => {});
                }
                return;
              }

              if (decodedText.includes('/request/')) {
                const parts = decodedText.split('/request/');
                const reqId = parts[parts.length - 1].split('?')[0];
                if (reqId) {
                  setActiveFulfillmentId(reqId);
                  setIsScannerOpen(false);
                  if (html5QrCode && html5QrCode.isScanning) {
                    html5QrCode.stop().catch(() => {});
                  }
                  router.push('/');
                  return;
                }
              }if (decodedText.startsWith('wnc://')) {
                try {
                  const url = new URL(decodedText);
                  const acc = url.searchParams.get('account');
                  if (acc) {
                    setRecipientInput(acc);
                    handleRecipientInputChange(acc);
                    setIsScannerOpen(false);
                    if (html5QrCode && html5QrCode.isScanning) {
                      html5QrCode.stop().catch(() => {});
                    }
                    return;
                  }
                } catch(e) {}
              }

              if (/^835\d{7}$/.test(decodedText.trim())) {
                setRecipientInput(decodedText.trim());
                handleRecipientInputChange(decodedText.trim());
                setIsScannerOpen(false);
                if (html5QrCode && html5QrCode.isScanning) {
                  html5QrCode.stop().catch(() => {});
                }
                return;
              }

              setRecipientInput(decodedText);
              handleRecipientInputChange(decodedText);
              setIsScannerOpen(false);
              if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.stop().catch(() => {});
              }
            },
            () => {}
          );
        } catch (err) {
          console.warn("[SCANNER_INIT_FAIL]", err);
        }
      }, 300);

      return () => {
        clearTimeout(timer);
        if (html5QrCode && html5QrCode.isScanning) {
          html5QrCode.stop().catch(() => {});
        }
      };
    }
  }, [isScannerOpen, router, setActiveFulfillmentId]);

  useEffect(() => {
    if (allAssets.length === 0 || hasInitialized.current) return;
    
    const symbol = searchParams.get('symbol');
    const chainIdParam = parseInt(searchParams.get('chainId') || '');

    if (symbol && !isNaN(chainIdParam)) {
        const target = allAssets.find(a => a.symbol === symbol && a.chainId === chainIdParam);
        if (target) {
            setSelectedToken(target);
            hasInitialized.current = true;
            return;
        }
    } else if (symbol) {
        const target = allAssets.find(a => a.symbol === symbol);
        if (target) {
            setSelectedToken(target);
            hasInitialized.current = true;
            return;
        }
    }

    const initial = allAssets.find(a => a.chainId === (viewingNetwork?.chainId ?? 1) && a.isNative) || 
                    allAssets.find(a => a.chainId === (viewingNetwork?.chainId ?? 1)) || 
                    allAssets[0];
    if (initial && !localStorage.getItem(SESSION_STORAGE_KEY)) {
        setSelectedToken(initial);
        hasInitialized.current = true;
    }
  }, [allAssets, searchParams, viewingNetwork]);

  const livePrice = useMemo(() => {
    if (!selectedToken || !prices) return 0;
    const priceId = (selectedToken.priceId || selectedToken.coingeckoId || selectedToken.address || '').toLowerCase();
    return prices[priceId]?.price || selectedToken.priceUsd || 0;
  }, [selectedToken, prices]);

  const handleAmountChange = (val: string) => {
    setDisplayAmount(val);
    const num = parseFloat(val) || 0;
    const rate = rates[selectedCurrency] || 1;

    if (inputType === 'token') {
      setAmount(val);
    } else {
      const tokenVal = num / (livePrice * rate || 1);
      setAmount(tokenVal.toString());
    }
  };

  const toggleInputType = () => {
    const val = parseFloat(displayAmount) || 0;
    const rate = rates[selectedCurrency] || 1;

    if (inputType === 'token') {
      const fiatVal = val * livePrice * rate;
      setDisplayAmount(fiatVal > 0 ? fiatVal.toFixed(2) : '');
      setInputType('fiat');
    } else {
      const tokenVal = val / (livePrice * rate || 1);
      setDisplayAmount(tokenVal > 0 ? tokenVal.toFixed(6) : '');
      setInputType('token');
    }
  };

  const addrType = useMemo(() => detectAddressType(debouncedRecipient), [debouncedRecipient]);
  const detectedMeta = useMemo(() => getDetectedNetworkMeta(addrType), [addrType]);

  const isSelfTransfer = useMemo(() => {
    const input = debouncedRecipient.trim().toLowerCase();
    if (!input) return false;
    if (accountNumber && input === accountNumber.toLowerCase()) return true;
    if (wallets) return wallets.some(w => w.address.toLowerCase() === input);
    return false;
  }, [debouncedRecipient, accountNumber, wallets]);

  const isWncAddressError = isWnc && debouncedRecipient.length > 0 && addrType !== 'account-id';

  const validationError = useMemo(() => {
    if (isSelfTransfer) return { title: "Self-Reflect Detected", message: "Dispatches to your own node are blocked to prevent redundancy." };
    if (isWncAddressError) return { title: "Registry Guard", message: "Sorry, we can't send WNC to raw addresses. You need to paste a unique ID number for any recipient." };
    if (addrType === 'invalid-evm-format') return { title: "Invalid Format", message: "This doesn't look like a valid address." };
    if (addrType === 'invalid-evm-checksum') return { title: "Checksum Fail", message: "Address failed cryptographic validation." };
    if (addrType === 'invalid-xrp') return { title: "Invalid XRP", message: "Address failed Base58 validation." };
    if (debouncedRecipient.length > 0 && addrType === 'invalid') return { title: "Unknown Format", message: "I could not find any node or blockchain related to this symbol." };
    return null;
  }, [addrType, isSelfTransfer, debouncedRecipient, isWncAddressError]);

  const isNetworkMismatch = useMemo(() => {
    if (isSelfTransfer || isWnc || !debouncedRecipient) return false;
    if (addrType === 'invalid' || addrType.includes('invalid-')) return false;
    if (addrType === 'account-id') return false; 
    const activeType = activeNetwork.type || 'evm';
    if (activeType === 'aptos' || activeType === 'sui') return addrType !== 'move-chain';
    const cosmosVariants = ['cosmos', 'osmosis', 'secret', 'injective', 'celestia'];
    if (cosmosVariants.includes(activeType)) return !cosmosVariants.includes(addrType);
    if (activeType === 'polkadot' || activeType === 'kusama') return !['polkadot', 'kusama'].includes(addrType);
    return activeType !== addrType;
  }, [addrType, activeNetwork.type, isSelfTransfer, isWnc, debouncedRecipient]);

  const processTransactionIntent = useCallback((input: string) => {
    const intent = parseBlockchainUri(input);
    if (!intent) return false;

    toast({
      title: "Payment Request Detected",
      description: `Extracting intent for ${intent.network}...`,
    });

    // 1. Attempt to switch token/network
    const targetToken = allAssets.find(a => 
      (intent.chainId ? a.chainId === intent.chainId : true) && 
      (a.symbol === intent.symbol || a.name?.toLowerCase() === intent.network?.toLowerCase())
    );

    if (targetToken) {
      setSelectedToken(targetToken);
      toast({
          title: "Network Resolved",
          description: `Switching to ${intent.network} (${targetToken.symbol})`,
      });
    } else {
      toast({
          variant: "destructive",
          title: "Unsupported Network",
          description: `Asset for ${intent.network} not found in current wallet.`,
      });
    }

    // 2. Hydrate fields
    setRecipientInput(intent.address);
    if (intent.amount) {
      setAmount(intent.amount);
      setDisplayAmount(intent.amount);
      setInputType('token');
      toast({
          title: "Transaction Prepared",
          description: `Amount set to ${intent.amount} ${intent.symbol || ''}`,
      });
    }

    return true;
  }, [allAssets, toast]);

  const handleRecipientInputChange = (val: string) => {
    // 🛡️ INTELLIGENT INTENT EXTRACTION
    if (processTransactionIntent(val)) return;

    if (val.includes('/request/')) {
      const parts = val.split('/request/');
      const reqId = parts[parts.length - 1].split('?')[0];
      if (reqId) {
        setActiveFulfillmentId(reqId);
        router.push('/');
        return;
      }
    }

    setRecipientInput(val);
    const type = detectAddressType(val);
    if (type === 'account-id') setIsResolving(true);
    else setIsResolving(false);
  };

  useEffect(() => {
    const input = debouncedRecipient.trim();
    if (!input) {
      setResolvedAddress('');
      setRecipientProfile(null);
      setResolutionError(null);
      lastVerifiedKey.current = '';
      setIsResolving(false);
      return;
    }

    const normalized = normalizeAddress(input);
    const networkKey = selectedToken?.chainId || activeNetwork?.name || 'unknown';
    const currentKey = `${normalized}-${networkKey}`;

    // 🛡️ VERIFICATION LOCK: Authoritative session cache check
    if (currentKey === lastVerifiedKey.current && resolvedAddress && !isResolving) {
      return;
    }

    const currentId = ++resolutionCounter.current;

    async function resolve() {
      // 🧊 AUTHORITATIVE CACHE LAYER
      if (verificationCache.current.has(currentKey)) {
        const cached = verificationCache.current.get(currentKey);
        if (currentId === resolutionCounter.current) {
          console.log(`[VERIFICATION_CACHE_HIT] ${currentKey}`);
          setResolvedAddress(cached.resolvedAddress);
          setRecipientProfile(cached.recipientProfile);
          setResolutionError(cached.resolutionError);
          setIsResolving(false);
          lastVerifiedKey.current = currentKey;
        }
        return;
      }

      const isInternalWnc = selectedToken?.symbol === 'WNC';
      const isRawChainAddress = ['evm', 'xrp', 'polkadot', 'kusama', 'near', 'btc', 'ltc', 'doge', 'solana', 'cosmos', 'osmosis', 'secret', 'injective', 'celestia', 'cardano', 'tron', 'algorand', 'hedera', 'tezos', 'move-chain', 'bitcoin-cash'].includes(addrType);

      if (isSelfTransfer || isNetworkMismatch || validationError || input.length < 3) {
        if (currentId === resolutionCounter.current) {
          setResolvedAddress('');
          setRecipientProfile(null);
          setIsResolving(false);
          setResolutionError(null);
          lastVerifiedKey.current = currentKey;
          // Cache negative results too to prevent spam
          verificationCache.current.set(currentKey, { resolvedAddress: '', recipientProfile: null, resolutionError: null });
        }
        return;
      }

      if (isRawChainAddress) {
        if (currentId === resolutionCounter.current) {
          setResolvedAddress(input);
          setRecipientProfile(null);
          setIsResolving(false);
          setResolutionError(null);
          lastVerifiedKey.current = currentKey;
          verificationCache.current.set(currentKey, { resolvedAddress: input, recipientProfile: null, resolutionError: null });
        }
        return;
      }

      if (addrType === 'account-id') {
        setIsResolving(true);
        setResolutionError(null);
        try {
          console.log(`[VERIFICATION_START] Identity Node: ${input}`);
          const { data: userRecord, error: fetchErr } = await supabase.from('profiles').select('*').eq('account_number', input).maybeSingle();
          if (currentId !== resolutionCounter.current) return;
          if (fetchErr) throw fetchErr;

          let resAddr = '';
          let resProfile = null;
          let resErr = null;

          if (userRecord) {
            resProfile = { id: userRecord.id, avatar: userRecord.photo_url || '', verified: true, name: userRecord.name || input };
            if (isInternalWnc) {
              resAddr = userRecord.account_number || '';
            } else {
              const targetChainType = activeNetwork.type || 'evm';
              const fieldName = `${targetChainType}_address`;
              const targetAddress = userRecord[fieldName];
              if (targetAddress) {
                resAddr = targetAddress;
              } else {
                resErr = `Identity node found, but no target registry configured for ${activeNetwork.name}.`;
              }
            }
          } else {
            resErr = "Identity Node not found in registry.";
          }

          setResolvedAddress(resAddr);
          setRecipientProfile(resProfile);
          setResolutionError(resErr);
          lastVerifiedKey.current = currentKey;
          verificationCache.current.set(currentKey, { resolvedAddress: resAddr, recipientProfile: resProfile, resolutionError: resErr });
        } catch (e: any) {
          if (currentId === resolutionCounter.current) {
            setResolvedAddress('');
            setResolutionError("Handshake failed.");
          }
        } finally {
          if (currentId === resolutionCounter.current) setIsResolving(false);
        }
        return;
      }
    }
    resolve();
  }, [debouncedRecipient, selectedToken?.chainId, activeNetwork?.type, isSelfTransfer, isNetworkMismatch, validationError, addrType]);

  const handleSendRequest = async () => {
    if (!wallets || !selectedToken || !resolvedAddress || !profile || isAccountProtected || !isFromAddressValid) return;
    setIsConfirmOpen(false); 
    setIsStatusVisible(true); 
    setTxStatus('pending'); 
    setIsSubmitting(true);

    try {
      const hash = await performTransactionDispatch({
        wallets,
        selectedToken,
        resolvedAddress,
        profile,
        activeNetwork,
        amount,
        prices,
        recipientProfile,
        infuraApiKey
      });

      setTxHash(hash);
      setTxStatus('success');
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e: any) { 
      setTxStatus('error'); 
      setReceiptError(mapTechnicalError(e)); 
    }
    finally { 
      setIsSubmitting(false); 
      setTimeout(() => { 
        setIsStatusVisible(false); 
        setIsReceiptOpen(true); 
      }, 3000); 
    }
  };

  const handleCloseReceipt = async (open: boolean) => {
    setIsReceiptOpen(open);
    if (!open && txStatus === 'success') {
      toast({ title: "Ledger Synchronizing" });
      await Promise.all([refreshProfile(), refresh()]);
      router.push('/');
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new Html5Qrcode("reader");
    try {
      const result = await reader.scanFile(file, true);
      if (result) {
        if (processTransactionIntent(result)) {
            setIsScannerOpen(false);
            return;
        }

        if (result.includes('/request/')) {
          const parts = result.split('/request/');
          const reqId = parts[parts.length - 1].split('?')[0];
          if (reqId) {
            setActiveFulfillmentId(reqId);
            setIsScannerOpen(false);
            router.push('/');
            return;
          }
        }

        if (result.startsWith('wnc://')) {
          try {
            const url = new URL(result);
            const acc = url.searchParams.get('account');
            if (acc) {
              setRecipientInput(acc);
              handleRecipientInputChange(acc);
              setIsScannerOpen(false);
              return;
            }
          } catch(e) {}
        }

        if (/^835\d{7}$/.test(result.trim())) {
          setRecipientInput(result.trim());
          handleRecipientInputChange(result.trim());
          setIsScannerOpen(false);
          return;
        }

        setRecipientInput(result);
        handleRecipientInputChange(result);
        setIsScannerOpen(false);
      }
    } catch (err) {
      toast({ variant: "destructive", title: "Scan Failed", description: "No valid QR code detected in image." });
    }
  };

  const balance = parseFloat(selectedToken?.balance || '0');
  const amountNum = parseFloat(amount) || 0;
  const amountUsd = amountNum * livePrice;

  // 🛡️ UNBLOCKED PROTOCOL: Check strictly if amount > balance, ignore gas reservation for UI blocking
  const hasInsufficientFunds = amountNum > (balance + 0.0000000001);

  const MAX_FREE_LIMIT = 100;
  const isOverLimit = !isPremium && amountUsd > MAX_FREE_LIMIT;

  const canSend = resolvedAddress.length > 0 && !isNetworkMismatch && !validationError && amountNum > 0 && !isSubmitting && !isSelfTransfer && !isWncAddressError && !isOverLimit && !isAccountProtected && isFromAddressValid;

  return (
    <div className="flex flex-col min-h-screen bg-[#050505] text-foreground relative">
      <header className="p-4 flex items-center justify-between border-b border-white/5 sticky top-0 bg-black/50 backdrop-blur-2xl z-50">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl"><ArrowLeft className="w-5 h-5" /></Button>
        
        <div className="flex items-center gap-2">
            <button onClick={() => setIsSelectorOpen(true)} className="flex items-center gap-2 bg-primary/10 border border-primary/20 pl-2 pr-3 py-1.5 rounded-full hover:bg-primary/20 transition-all active:scale-95">
                <TokenLogoDynamic logoUrl={selectedToken?.iconUrl} size={20} chainId={selectedToken?.chainId} symbol={selectedToken?.symbol} name={selectedToken?.name} />
                <span className="text-[11px] font-black uppercase text-white tracking-tight">{selectedToken?.symbol || '...'}</span>
                <ChevronDown className="w-3 h-3 text-primary" />
            </button>
            <button onClick={() => setIsRecentOpen(true)} className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-primary hover:bg-white/10 transition-all active:scale-90">
                <Users className="w-4 h-4" />
            </button>
        </div>

        <div className="flex items-center gap-1">
          <Link href="/send/wnc-send" className="p-2 rounded-xl hover:bg-white/5 text-primary transition-all active:scale-90">
            <Zap className="w-5 h-5 fill-primary" />
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setIsScannerOpen(true)} className="rounded-xl"><QrCode className="w-5 h-5 text-primary" /></Button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-lg mx-auto w-full pb-48">
          <div className="space-y-10 pt-2">
            
            <AnimatePresence>
              {isAccountProtected && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 flex gap-4 shadow-2xl mb-4">
                  <ShieldOff className="w-6 h-6 text-red-500 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-red-500 uppercase tracking-widest">Account Protected</p>
                    <p className="text-[11px] text-red-400/80 leading-relaxed font-medium">
                      All dispatches are disabled. Re-enable in <button onClick={() => router.push('/profile/security')} className="text-white underline font-bold">Settings</button>.
                    </p>
                  </div>
                </motion.div>
              )}

              {!isFromAddressValid && wallets && !isWnc && !isAccountProtected && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-5 rounded-[2.5rem] bg-red-500/10 border border-red-500/20 flex gap-4 shadow-2xl mb-4">
                  <ShieldAlert className="w-6 h-6 text-red-500 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-black text-red-500 uppercase tracking-widest">Registry Error</p>
                    <p className="text-[11px] text-red-400/80 leading-relaxed font-medium">
                      Failed to resolve a valid vault node for {activeNetwork.name}. Please re-sync your hardware keys in <button onClick={() => router.push('/security/backup')} className="text-white underline font-bold">Registry Hub</button>.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <section className="flex items-center justify-between">
                <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                        <Avatar className="w-20 h-20 rounded-[2.5rem] border-2 border-primary/30 shadow-2xl bg-black relative z-10"><AvatarImage src={profile?.photo_url} /><AvatarFallback className="bg-primary/20 text-primary font-black text-xl">{profile?.name?.[0] || 'N'}</AvatarFallback></Avatar>
                        <div className="absolute -bottom-2 -right-2 bg-black rounded-xl p-1 border border-white/10 shadow-xl z-20"><TokenLogoDynamic logoUrl={selectedToken?.iconUrl} size={24} chainId={selectedToken?.chainId} symbol={selectedToken?.symbol} name={selectedToken?.name} alt="token badge" /></div>
                    </div>
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">FROM NODE</span>
                </div>
                <div className="flex-1 px-4 relative flex flex-col items-center justify-center min-h-[100px]">
                    <div className="w-full h-[1px] bg-gradient-to-r from-primary/20 via-primary to-primary/20 relative"><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#050505] p-2 border border-white/5 rounded-full z-10"><ArrowRight className="w-4 h-4 text-primary animate-pulse" /></div></div>
                    <AnimatePresence>{resolvedAddress && !isResolving && (
                        <motion.div initial={{ y: 20, opacity: 0, scale: 0.9 }} animate={{ y: 30, opacity: 1, scale: 1 }} exit={{ y: 15, opacity: 0 }} className="absolute left-0 right-0 text-center z-20"><div className="inline-flex flex-col items-center gap-1.5"><p className={cn("text-[7px] font-black uppercase tracking-[0.25em]", (isNetworkMismatch || validationError) ? "text-red-500" : "text-primary")}>{isNetworkMismatch ? 'Incompatible Route' : validationError ? 'Format Alert' : 'Resolved Identity'}</p><div className={cn("bg-black/80 border px-3 py-2 rounded-2xl backdrop-blur-md shadow-2xl", (isNetworkMismatch || validationError) ? "border-red-500/30" : "border-primary/20")}><p className="text-[10px] font-mono text-white tracking-tighter whitespace-nowrap">{resolvedAddress.length > 15 ? `${resolvedAddress.slice(0, 10)}...${resolvedAddress.slice(-8)}` : resolvedAddress}</p></div></div></motion.div>
                    )}</AnimatePresence>
                </div>
                <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                        <div className={cn("w-20 h-20 rounded-[2.5rem] border-2 flex items-center justify-center transition-all duration-500 bg-black relative overflow-hidden z-10", (!resolvedAddress && !isNetworkMismatch && !validationError && !isSelfTransfer) ? "border-dashed border-white/10" : (isNetworkMismatch || (resolvedAddress && validationError) || isSelfTransfer) ? "border-red-500 bg-red-500/10 border-dashed" : "border-primary/50 shadow-[0_0_30px_rgba(139,92,246,0.15)]")}>{isResolving ? <Loader2 className="w-8 h-8 animate-spin text-primary opacity-40" /> : isSelfTransfer ? <Avatar className="w-full h-full rounded-none"><AvatarImage src={profile?.photo_url} /><AvatarFallback>{profile?.name?.[0]}</AvatarFallback></Avatar> : recipientProfile ? <Avatar className="w-full h-full rounded-none"><AvatarImage src={recipientProfile.avatar} /><AvatarFallback>{(recipientProfile.name?.[0] || 'N').toUpperCase()}</AvatarFallback></Avatar> : (isNetworkMismatch || validationError) ? <TokenLogoDynamic logoUrl={null} alt="Err" size={40} symbol={detectedMeta?.symbol} name={detectedMeta?.name} /> : resolvedAddress ? <TokenLogoDynamic logoUrl={selectedToken?.iconUrl} alt="Token" size={40} chainId={selectedToken?.chainId} symbol={selectedToken?.symbol} name={selectedToken?.name} /> : <Search className="w-8 h-8 text-white/10" />}</div>
                        {resolvedAddress && !isResolving && <div className="absolute -bottom-2 -right-2 bg-black rounded-xl p-1 border border-white/10 shadow-xl z-20"><TokenLogoDynamic logoUrl={selectedToken?.iconUrl} size={24} chainId={selectedToken?.chainId} symbol={selectedToken?.symbol} name={selectedToken?.name} alt="token badge" /></div>}
                    </div>
                    <span className={cn("text-[8px] font-black uppercase tracking-widest truncate w-20 text-center", (isNetworkMismatch || validationError || isSelfTransfer) ? "text-red-500" : "text-white/40")}>{isSelfTransfer ? 'SELF-REFLECT' : recipientProfile ? `TO @${(recipientProfile.name || 'Unknown').toUpperCase()}` : isNetworkMismatch ? `${detectedMeta?.name || 'UNKNOWN'} DETECTED` : (validationError || (debouncedRecipient && addrType === 'invalid')) ? 'NODE INVALID' : resolvedAddress ? 'TARGET NODE' : 'TO IDENTITY'}</span>
                </div>
            </section>

            <section className="space-y-3">
                <div className="flex justify-between items-center px-2"><Label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Node Target</Label><button onClick={async () => handleRecipientInputChange(await navigator.clipboard.readText())} className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/10 px-2.5 py-1 rounded-lg">PASTE</button></div>
                <div className={cn("bg-white/[0.03] border border-white/10 rounded-[2rem] p-2", (isNetworkMismatch || validationError || isSelfTransfer) && "border-red-500/50 bg-red-500/5")}><div className="flex items-center gap-2 px-2"><Input placeholder="Node ID or Address" value={recipientInput} onChange={(e) => handleRecipientInputChange(e.target.value)} className="h-12 bg-transparent border-none text-sm font-mono focus-visible:ring-0 text-white flex-1" />{isResolving && <Loader2 className="w-4 h-4 animate-spin text-primary" />}</div></div>
                {(resolutionError || (validationError && (debouncedRecipient || isSelfTransfer))) && !isResolving && !isNetworkMismatch && <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-center gap-3"><AlertCircle className="w-4 h-4 text-red-500 opacity-60" /><p className="text-[10px] font-black text-red-500/80 uppercase leading-relaxed">{resolutionError || (validationError as any)?.message}</p></div>}
                {isNetworkMismatch && !isSelfTransfer && <div className="p-5 rounded-[2rem] bg-red-500/10 border border-red-500/20 flex gap-4"><div className="w-12 h-12 rounded-2xl bg-red-500/20 flex items-center justify-center shrink-0"><ShieldAlert className="w-6 h-6 text-red-500" /></div><div className="space-y-1.5"><p className="text-[10px] font-black text-red-500 uppercase tracking-[0.2em]">Security Alert: {detectedMeta?.name} Address Detected</p><p className="text-xs font-bold text-red-400 leading-relaxed">You are currently trying to send <span className="text-white font-black underline">{activeNetwork?.name || 'Registry'}</span>. Sending to a different target node will result in permanent loss of funds.</p></div></div>}
            </section>

            <div className="space-y-3">
                <div className="flex justify-between items-center px-2">
                  <Label className="text-[10px] font-black text-white/60 uppercase tracking-[0.2em]">Authorization Amount</Label>
                  <div className="flex items-center gap-2">
                    <span className={cn("text-[9px] font-bold uppercase", hasInsufficientFunds ? "text-red-400 animate-pulse" : "text-white/40")}>Bal: {balance.toFixed(2)} {selectedToken?.symbol}</span>
                    <button className="h-6 px-2 text-[9px] font-black text-primary uppercase bg-primary/10 rounded-md transition-all active:scale-90" onClick={() => handleAmountChange(balance.toString())}>MAX</button>
                  </div>
                </div>
                <div className={cn("bg-white/[0.03] border rounded-[2.5rem] p-5 transition-all", (hasInsufficientFunds || isOverLimit) ? "border-red-500/30 ring-4 ring-red-500/5" : "border-white/10")}>
                  <div className="flex items-baseline justify-between gap-4">
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      value={displayAmount} 
                      onChange={(e) => handleAmountChange(e.target.value)} 
                      className={cn("bg-transparent border-none text-[clamp(1.5rem,8vw,2.5rem)] font-black p-0 h-auto focus-visible:ring-0 tracking-tighter", (hasInsufficientFunds || isOverLimit) ? "text-red-400" : "text-white")} 
                    /><button 
                      onClick={toggleInputType}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all active:scale-95 shrink-0"
                    >
                      <span className="text-sm font-black text-primary uppercase">
                        {inputType === 'token' ? selectedToken?.symbol : selectedCurrency}
                      </span>
                      <Repeat className="w-3 h-3 text-primary opacity-40" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="text-[10px] font-bold text-muted-foreground/40 uppercase italic">
                      {hasInsufficientFunds ? (
                        <span className="text-red-400/60 font-black">Insufficient Node Funds</span>
                      ) : isOverLimit ? (
                        <span className="text-red-400/60 font-black">Plan Limit: $100.00 Max</span>
                      ) : (
                        <span>
                          ≈ {inputType === 'token' ? formatFiat(amountNum * livePrice) : `${amountNum.toFixed(6)} ${selectedToken?.symbol}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {isOverLimit && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3 shadow-xl">
                      <Crown className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Premium Required</p>
                        <p className="text-[11px] text-zinc-400 leading-relaxed font-medium mt-1">
                          Free users are limited to <span className="text-white font-bold">$100.00</span> per transaction. 
                          <button onClick={() => router.push('/buy')} className="text-amber-500 font-bold underline ml-1">Upgrade to Premium</button> for unlimited institutional transfers.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Registry Gas</p>
                      <Fuel className="w-3 h-3 text-primary opacity-40" />
                    </div>
                    <div className="flex items-baseline gap-1">
                      {!gasDataFromService ? (
                        <div className="h-4 w-12 bg-white/5 animate-pulse rounded" />
                      ) : (
                        <p className="text-xs font-bold text-white truncate">{gasDataFromService.nativeFee || '0'} {activeNetwork?.symbol || ''}</p>
                      )}
                    </div>
                  </div>

                  <div className="p-4 rounded-3xl bg-white/[0.02] border border-white/5 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Institutional Fee</p>
                      <Zap className="w-3 h-3 text-primary fill-primary animate-pulse" />
                    </div>
                    <p className="text-xs font-bold text-white">
                      {formatFiat(0.05)}
                    </p>
                  </div>
                </div>
            </div>
          </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black/95 to-transparent backdrop-blur-md z-40">
          <div className="max-md mx-auto"><Button className={cn("w-full h-16 rounded-[2rem] text-lg font-black shadow-2xl transition-all border-b-4", canSend ? "bg-primary hover:bg-primary/90 border-primary/50 text-white" : "bg-zinc-900 border-zinc-950 opacity-50 grayscale cursor-not-allowed")} disabled={!canSend} onClick={() => setIsConfirmOpen(true)}>{isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : isAccountProtected ? "Account Protected" : !isFromAddressValid ? "Resolution Failed" : "Sign & Authorize Node"}</Button></div>
        </div>
      </main>

      <AnimatePresence>{isScannerOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-6"><div className="w-full max-sm mx-auto space-y-8"><div className="flex items-center justify-between"><div className="space-y-1"><h3 className="text-xl font-black text-white uppercase tracking-tight">Identity Scanner</h3><p className="text-[10px] font-black text-primary uppercase tracking-widest">WNC Structured Handshake</p></div><Button variant="ghost" size="icon" onClick={() => setIsScannerOpen(false)} className="rounded-full bg-white/5"><X className="w-5 h-5 text-white" /></Button></div><div className="relative aspect-square w-full rounded-[3rem] overflow-hidden border-4 border-primary/20 shadow-2xl bg-zinc-900"><div id="reader" className="w-full h-full" /><motion.div animate={{ y: [0, 250, 0] }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="absolute left-0 right-0 h-1 bg-primary/60 blur-md z-10" /></div><div className="space-y-4 px-4"><Button onClick={() => fileInputRef.current?.click()} variant="outline" className="w-full h-14 rounded-2xl bg-white/5 border-white/10 gap-3 font-bold uppercase tracking-widest text-[10px] text-white hover:bg-white/10"><ImageIcon className="w-4 h-4 text-primary" /> Get from Gallery</Button><input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" /><div className="flex items-center justify-center gap-2 opacity-40"><ShieldCheck className="w-3.5 h-3.5 text-white" /><span className="text-[8px] font-black uppercase text-white">Registry Protocol v3.1</span></div></div></div></motion.div>
      )}</AnimatePresence>

      <Sheet open={isRecentOpen} onOpenChange={setIsRecentOpen}>
        <SheetContent side="bottom" hideCloseButton={true} className="bg-[#0a0a0c] border-t border-primary/20 rounded-t-[3.5rem] p-0 h-[60vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-black/80 -z-10" />
            <div className="w-12 h-1 bg-white/10 rounded-full mx-auto my-4 shrink-0" />
            
            <SheetHeader className="px-8 mb-6 shrink-0">
                <SheetTitle className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" /> Recent Registry
                </SheetTitle>
                <SheetDescription className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">
                    Your frequently utilized identity nodes
                </SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1 px-6">
                <div className="space-y-2 pb-32">
                    {isRecentLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 opacity-20">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Scanning History...</p>
                        </div>
                    ) : recentRecipients.length > 0 ? (
                        recentRecipients.map((recip, i) => {
                            const lastSentDate = recip.last_sent_at ? new Date(recip.last_sent_at) : null;
                            const isValidDate = lastSentDate instanceof Date && !isNaN(lastSentDate.getTime());
                            return (
                                <motion.button
                                    key={recip.id || i}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    onClick={() => handleSelectRecent(recip)}
                                    className="w-full flex items-center justify-between p-4 rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] transition-all group active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-4">
                                        <Avatar className="w-12 h-12 rounded-2xl border border-white/10 shadow-lg">
                                            <AvatarImage src={recip.photo_url} className="object-cover" />
                                            <AvatarFallback className="bg-primary/20 text-primary font-black uppercase text-xs">
                                                {recip.name?.[0] || 'N'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="text-left">
                                            <p className="font-black text-sm text-white tracking-tight">@{recip.name}</p>
                                            <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-40">
                                                Last: {isValidDate ? formatDistanceToNow(lastSentDate) + ' ago' : 'Recently'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/10 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Check className="w-4 h-4" />
                                    </div>
                                </motion.button>
                            );
                        })
                    ) : (
                        <div className="py-24 flex flex-col items-center justify-center text-center space-y-4 opacity-20">
                            <div className="w-16 h-16 rounded-[2rem] bg-white/5 border border-dashed border-white/10 flex items-center justify-center">
                                <Users className="w-8 h-8 text-white" />
                            </div>
                            <p className="text-xs font-black uppercase tracking-widest">No Recent Handshakes</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </SheetContent>
      </Sheet>

      <GlobalTokenSelector isOpen={isSelectorOpen} onOpenChange={setIsSelectorOpen} onSelect={(token) => { setSelectedToken(token); }} title="Select Asset" />
      
      <TransactionConfirmationSheet 
        isOpen={isConfirmOpen} 
        onOpenChange={setIsConfirmOpen} 
        onConfirm={handleSendRequest} 
        isSubmitting={isSubmitting} 
        amountUsd={amountUsd} 
        amountToken={amount}
        token={selectedToken} 
        recipientName={recipientProfile?.name || (resolvedAddress ? `${resolvedAddress.slice(0,6)}...${resolvedAddress.slice(-4)}` : 'Target Node')} 
        recipientAddress={resolvedAddress} 
        recipientAvatar={recipientProfile?.avatar} 
        totalFeeUsd={totalFeeUsd} 
      />
      
      <TransactionStatusCard 
        isVisible={isStatusVisible} 
        status={txStatus} 
        senderName="You" 
        senderAvatar={profile?.photo_url} 
        recipientName={recipientProfile?.name || 'Target Node'} 
        recipientAvatar={recipientProfile?.avatar} 
        token={{ symbol: selectedToken?.symbol || '', iconUrl: selectedToken?.iconUrl, chainId: selectedToken?.chainId || 1, name: selectedToken?.name }} 
        isRawAddress={!recipientProfile} 
      />
      
      <TransactionReceiptSheet 
        isOpen={isReceiptOpen} 
        onOpenChange={handleCloseReceipt} 
        status={txStatus === 'error' ? 'error' : 'success'} 
        amount={amount} 
        token={selectedToken} 
        recipientName={recipientProfile?.name || 'Target Node'} 
        recipientAddress={resolvedAddress} 
        txHash={txHash} 
        errorReason={receiptError} 
        fee={formatFiat(totalFeeUsd)} 
        networkName={activeNetwork?.name || 'Registry'} 
      />
    </div>
  );
}

export default function SendPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-[#050505]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SendClient />
    </Suspense>
  );
}