'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect, useCallback, useRef } from 'react';
import type { AssetRow, ChainConfig, WalletWithMetadata, Notification, UnifiedTransaction } from '@/lib/types';
import { useNetworkLogos } from '@/hooks/useNetworkLogos';
import { useUser } from './user-provider';
import { useMarket } from './market-provider';
import { useWalletEngine } from '@/contexts/hooks/useWalletEngine';
import { deriveAllWallets } from '@/lib/wallets/derive';
import { getAddressForChain as getAddressForChainUtil, validateAddressForChain } from '@/lib/wallets/utils';
import { 
  syncAddressesToCloud, 
  saveVaultToCloud, 
  saveInfuraToCloud,
  saveAlchemyToCloud,
  purgeLocalWalletCache,
  decryptValueFromServer,
  deleteCloudWallet
} from '@/lib/wallets/services/wallet-actions';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { getInitialAssets } from '@/lib/wallets/balances';
import type { PriceResult } from '@/lib/market/price-service';
import { backgroundSyncWorker, type SyncDiagnostic } from '@/lib/wallets/background-sync-worker';
import { GlobalWatcherService } from '@/lib/services/global-watcher-service';
import { useRealtimeGateway } from '@/hooks/useRealtimeGateway';
import { systemEmitter } from '@/lib/events/systemEmitter';
import { RPCUpgradeCard } from '@/components/shared/RPCUpgradeCard';
import { useRenderTracker } from '@/lib/telemetry/render-tracker';
import { fetchOrchestrator } from '@/lib/telemetry/fetch-orchestrator';

interface WalletContextType {
  isInitialized: boolean;
  isWalletLoading: boolean;
  hasNewNotifications: boolean;
  setHasNewNotifications: (val: boolean) => void;
  viewingNetwork: ChainConfig;
  setNetwork: (network: ChainConfig) => void;
  allAssets: AssetRow[];
  allChains: ChainConfig[];
  allChainsMap: { [key: string]: ChainConfig };
  isRefreshing: boolean;
  wallets: WalletWithMetadata[] | null;
  balances: { [key: string]: AssetRow[] };
  prices: PriceResult;
  accountNumber: string | null;
  refresh: () => Promise<void>;
  importWallet: (mnemonic: string) => Promise<void>;
  generateWallet: () => Promise<string>;
  saveToVault: () => Promise<void>;
  restoreFromCloud: (onStatusUpdate?: (status: string) => void) => Promise<void>;
  deleteWallet: () => void;
  deleteWalletPermanently: () => Promise<void>;
  logout: () => Promise<void>;
  getAddressForChain: (chain: ChainConfig, wallets: WalletWithMetadata[]) => string | undefined;
  infuraApiKey: string | null;
  setInfuraApiKey: (key: string | null) => Promise<void>;
  alchemyApiKey: string | null;
  setAlchemyApiKey: (key: string | null) => Promise<void>;
  hiddenTokenKeys: Set<string>;
  toggleTokenVisibility: (chainId: number, symbol: string) => void;
  userAddedTokens: AssetRow[];
  addUserToken: (token: AssetRow) => void;
  getAvailableAssetsForChain: (chainId: number) => AssetRow[];
  isRequestOverlayOpen: boolean;
  setIsRequestOverlayOpen: (open: boolean) => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (open: boolean) => void;
  isQuickSwapOpen: boolean;
  setIsQuickSwapOpen: (open: boolean) => void;
  activeFulfillmentId: string | null;
  setActiveFulfillmentId: (id: string | null) => void;
  hasFetchedInitialData: boolean;
  syncDiagnostic: SyncDiagnostic;
  runCloudDiagnostic: (force?: boolean) => Promise<void>;
  dismissSyncCard: () => void;
  notifications: { unread_count: number; items: Notification[] };
  txRegistry: Record<string, UnifiedTransaction[]>; 
  markNotificationsAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  isCloudVaultAvailable: boolean;
  isSynced: boolean;
  realtimeStatus: 'CONNECTED' | 'DISCONNECTED' | 'SYNCING';
  isRPCDegraded: boolean;
  setIsUpgradeCardVisible: (val: boolean) => void;
  isRefreshingBalances?: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const BRAND_TOKEN_MAP: Record<number, string> = {
  10: 'OP',
  42161: 'ARB',
  534352: 'SCR',
  137: 'POL',
};

const WNC_LOGO_URL = '/icons/iconwnc.png';

export function WalletProvider({ children }: { children: ReactNode }) {
  // 1. STATE INITIALIZATION (Move to top to avoid ReferenceError)
  const [isInitialized, setIsInitialized] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [wallets, setWallets] = useState<WalletWithMetadata[] | null>(null);
  const [balances, setBalances] = useState<{ [key: string]: AssetRow[] }>({});
  const [accountNumber, setAccountNumber] = useState<string | null>(null);
  const [viewingNetwork, setViewingNetwork] = useState<ChainConfig | null>(null);
  const [infuraApiKey, setInfuraApiKeyState] = useState<string | null>(null);
  const [alchemyApiKey, setAlchemyApiKeyState] = useState<string | null>(null);
  const [userAddedTokens, setUserAddedTokens] = useState<AssetRow[]>([]);
  const [hiddenTokenKeys, setHiddenTokenKeys] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasFetchedInitialData, setHasFetchedInitialData] = useState(false);
  const [isRequestOverlayOpen, setIsRequestOverlayOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isQuickSwapOpen, setIsQuickSwapOpen] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [activeFulfillmentId, setActiveFulfillmentId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState({ unread_count: 0, items: [] as Notification[] });
  const [txRegistry, setTxRegistry] = useState<Record<string, UnifiedTransaction[]>>({});
  const [realtimeStatus, setRealtimeStatus] = useState<'CONNECTED' | 'DISCONNECTED' | 'SYNCING'>('SYNCING');
  const [isRPCDegraded, setIsRPCDegraded] = useState(false);
  const [isUpgradeCardVisible, setIsUpgradeCardVisible] = useState(false);
  const [isKeyPromptOpen, setIsKeyPromptOpen] = useState(false);
  const [syncDiagnostic, setSyncDiagnostic] = useState<SyncDiagnostic>({ status: 'idle', chain: null, localValue: null, cloudValue: null, progress: 0 });

  const router = useRouter();
  const { toast } = useToast();
  const { chainsWithLogos, allChainsMap } = useNetworkLogos();
  const { user, profile, loading: authLoading, signOut, refreshProfile, isTerminalLocked } = useUser();
  const { prices, registerCustomTokens } = useMarket();

  const syncAbortControllerRef = useRef<AbortController | null>(null);
  const isSyncingRef = useRef(false);
  const subscriptionRef = useRef<any>(null);
  const watcherRef = useRef<GlobalWatcherService | null>(null);
  const lastReadTimestampRef = useRef<number>(0);
  const highestBlockRef = useRef<{ [chain: string]: number }>({});

  // 2. TELEMETRY AUDIT
  useRenderTracker('WalletProvider', {
    hasWallets: !!wallets,
    activeChainId: viewingNetwork?.chainId,
    isInitialized,
    isWalletLoading
  });

  const effectiveViewingNetwork = useMemo(() => {
    if (viewingNetwork) return viewingNetwork;
    if (typeof window !== 'undefined' && user) {
      const savedId = localStorage.getItem(`active_network_id_${user.id}`);
      if (savedId && allChainsMap[parseInt(savedId)]) {
        return allChainsMap[parseInt(savedId)];
      }
    }
    const btcNode = chainsWithLogos.find(c => c.chainId === 0);
    return btcNode || (chainsWithLogos[0] || { chainId: 1, name: 'Ethereum', symbol: 'ETH', rpcUrl: 'https://mainnet.infura.io/v3/{API_KEY}', type: 'evm' } as ChainConfig);
  }, [viewingNetwork, chainsWithLogos, allChainsMap, user]);

  const isSynced = useMemo(() => {
    if (!profile || !wallets || !isInitialized) return true;
    const evmLocal = wallets.find(w => w.type === 'evm')?.address;
    if (evmLocal && profile.evm_address !== evmLocal) return false;
    const solLocal = wallets.find(w => w.type === 'solana')?.address;
    if (solLocal && profile.solana_address !== solLocal) return false;
    const btcLocal = wallets.find(w => w.type === 'btc')?.address;
    if (btcLocal && profile.btc_address !== btcLocal) return false;
    return true;
  }, [profile, wallets, isInitialized]);

  const primaryEvmAddress = useMemo(() => wallets?.find(w => w.type === 'evm')?.address || null, [wallets]);

  useEffect(() => {
    if (effectiveViewingNetwork?.chainId) {
      fetchOrchestrator.setActiveChain(effectiveViewingNetwork.chainId);
    }
  }, [effectiveViewingNetwork?.chainId]);

  useRealtimeGateway(isInitialized && !isTerminalLocked ? primaryEvmAddress : null);

  const runCloudDiagnostic = useCallback(async (force = false) => {
    const userId = user?.id;
    const hasMnemonic = userId && !!localStorage.getItem(`ss-mnemonic-${userId}`);
    if (!userId || !wallets?.length || !accountNumber || !chainsWithLogos.length || isTerminalLocked || !hasMnemonic) return;
    const sessionKey = `ss-sync-lock-${userId}`;
    const alreadySyncedInSession = typeof window !== 'undefined' && sessionStorage.getItem(sessionKey);
    if (!force && alreadySyncedInSession) return;
    if (isSyncingRef.current) return;
    if (syncAbortControllerRef.current) syncAbortControllerRef.current.abort();
    syncAbortControllerRef.current = new AbortController();
    const signal = syncAbortControllerRef.current.signal;
    isSyncingRef.current = true;
    try {
      await refreshProfile();
      await backgroundSyncWorker.performCloudAudit(userId, wallets, profile || null, accountNumber, chainsWithLogos, (update) => setSyncDiagnostic(prev => ({ ...prev, ...update })), () => signal.aborted);
      if (typeof window !== 'undefined' && !signal.aborted) sessionStorage.setItem(sessionKey, 'true');
    } finally { isSyncingRef.current = false; }
  }, [user?.id, wallets, profile, accountNumber, chainsWithLogos, isTerminalLocked, refreshProfile]);

  const dismissSyncCard = useCallback(() => {
    if (syncAbortControllerRef.current) syncAbortControllerRef.current.abort();
    isSyncingRef.current = false;
    setSyncDiagnostic({ status: 'idle', chain: null, localValue: null, cloudValue: null, progress: 0 });
  }, []);

  useEffect(() => {
    if (!user?.id || !supabase) return;
    if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current);
    const channel = supabase.channel(`vault-registry-sync-${user.id}`).on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` }, (payload) => {
      if (payload.new?.vault_phrase !== payload.old?.vault_phrase) runCloudDiagnostic(true);
    }).subscribe();
    subscriptionRef.current = channel;
    return () => { if (subscriptionRef.current) supabase.removeChannel(subscriptionRef.current); };
  }, [user?.id, runCloudDiagnostic]);

  useEffect(() => {
    if (authLoading || !user || !profile) return;
    const attemptKeyRecovery = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        if (!localStorage.getItem(`ss-infura-key-${user.id}`) && profile.vault_infura_key && profile.infura_iv) {
          const key = await decryptValueFromServer(profile.vault_infura_key, profile.infura_iv);
          setInfuraApiKeyState(key);
          localStorage.setItem(`ss-infura-key-${user.id}`, key);
        }
      } catch (e) { console.warn("[VAULT_RECOVERY_ADVISORY] Key sync deferred."); }
    };
    attemptKeyRecovery();
  }, [user?.id, profile, authLoading]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setWallets(null); setAccountNumber(null); setBalances({}); setInfuraApiKeyState(null); setAlchemyApiKeyState(null);
      setUserAddedTokens([]); setHiddenTokenKeys(new Set()); setIsInitialized(false); setIsWalletLoading(false);
      return;
    }
    const userId = user.id;
    setIsWalletLoading(true);
    const savedMnemonic = localStorage.getItem(`ss-mnemonic-${userId}`);
    if (!savedMnemonic) { setIsInitialized(false); setIsWalletLoading(false); return; }
    const savedWallets = localStorage.getItem(`ss-cached-wallets-${userId}`);
    if (savedWallets) { try { setWallets(JSON.parse(savedWallets)); } catch(e) {} } else {
      deriveAllWallets(savedMnemonic).then(derived => {
        setWallets(derived); localStorage.setItem(`ss-cached-wallets-${userId}`, JSON.stringify(derived));
      });
    }
    setAccountNumber(localStorage.getItem(`account_number_${userId}`));
    const savedBals = localStorage.getItem(`ss-wallet-balances-${userId}`);
    if (savedBals) { try { const { data } = JSON.parse(savedBals); setBalances(data || {}); } catch(e) {} }
    setInfuraApiKeyState(localStorage.getItem(`ss-infura-key-${userId}`));
    setAlchemyApiKeyState(localStorage.getItem(`ss-alchemy-key-${userId}`));
    const savedTokens = localStorage.getItem(`custom_tokens_${userId}`);
    if (savedTokens) { try { const parsed = JSON.parse(savedTokens); setUserAddedTokens(parsed); registerCustomTokens(parsed); } catch(e) {} }
    const savedHidden = localStorage.getItem(`hidden_tokens_${userId}`);
    if (savedHidden) { try { setHiddenTokenKeys(new Set(JSON.parse(savedHidden))); } catch(e) {} }
    setIsInitialized(true); setIsWalletLoading(false);
  }, [user?.id, authLoading, registerCustomTokens]);

  const allAssets = useMemo(() => {
    if (!isInitialized || !effectiveViewingNetwork) return [];
    const base = getInitialAssets(effectiveViewingNetwork.chainId);
    const custom = userAddedTokens.filter(t => t.chainId === effectiveViewingNetwork.chainId);
    const registry = [...base, ...custom].reduce((acc, curr) => {
      const id = curr.isNative ? curr.symbol : curr.address?.toLowerCase();
      if (!acc.find(a => (a.isNative ? a.symbol : a.address?.toLowerCase()) === id)) acc.push(curr);
      return acc;
    }, [] as AssetRow[]);
    const wncPrice = prices['internal:wnc']?.price || 0.0006;
    const wncAsset = { chainId: effectiveViewingNetwork.chainId, address: 'internal:wnc', symbol: 'WNC', name: 'Wevinacoin', balance: profile?.wnc_earnings?.toString() || '0', isNative: false, priceUsd: wncPrice, fiatValueUsd: (profile?.wnc_earnings || 0) * wncPrice, pctChange24h: prices['internal:wnc']?.change || 0, decimals: 0, iconUrl: WNC_LOGO_URL } as AssetRow;
    const chainBalances = balances[effectiveViewingNetwork.chainId] || [];
    const brandTokenSymbol = BRAND_TOKEN_MAP[effectiveViewingNetwork.chainId];
    const mappedAssets = registry.map(asset => {
      const balDoc = chainBalances.find(b => asset.isNative ? b.symbol === asset.symbol : b.address?.toLowerCase() === asset.address?.toLowerCase());
      const p = prices[(asset.priceId || asset.coingeckoId || asset.address || '').toLowerCase()];
      return { ...asset, balance: balDoc?.balance || '0', priceUsd: p?.price || 0, fiatValueUsd: parseFloat(balDoc?.balance || '0') * (p?.price || 0), pctChange24h: p?.change || 0, iconUrl: (asset.symbol === 'WNC' || asset.name === 'Wevinacoin') ? WNC_LOGO_URL : asset.iconUrl } as AssetRow;
    });
    return [wncAsset, ...mappedAssets].filter(a => {
      if (brandTokenSymbol && a.symbol === 'ETH' && effectiveViewingNetwork.chainId !== 1) return false;
      const key = `${effectiveViewingNetwork.chainId}:${a.symbol}`;
      return (a.symbol === 'WNC' || a.isNative || brandTokenSymbol === a.symbol || userAddedTokens.some(t => t.chainId === effectiveViewingNetwork.chainId && t.symbol === a.symbol)) && !hiddenTokenKeys.has(key);
    }).sort((a, b) => {
      if (a.symbol === 'WNC') return -1; if (b.symbol === 'WNC') return 1;
      return (b.fiatValueUsd || 0) - (a.fiatValueUsd || 0);
    });
  }, [isInitialized, effectiveViewingNetwork, profile?.wnc_earnings, balances, prices, hiddenTokenKeys, userAddedTokens]);

  const fetchNotifications = useCallback(async () => {
    if (!user || !supabase || isTerminalLocked) return;
    if (Date.now() - lastReadTimestampRef.current < 4000) return;
    try {
      const { data, error } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
      if (!error && data) {
        setNotifications({ unread_count: data.filter(n => !n.is_read).length, items: data as Notification[] });
      }
    } catch (e) {}
  }, [user?.id, isTerminalLocked]);

  useEffect(() => {
    if (!user?.id || !wallets || !isInitialized || isTerminalLocked) return;
    fetchNotifications();
    const rpcUrls: Record<number, string> = {};
    chainsWithLogos.forEach(c => { if (c.rpcUrl && c.type === 'evm') rpcUrls[c.chainId] = c.rpcUrl.replace('{API_KEY}', infuraApiKey || ''); });
    if (!watcherRef.current) watcherRef.current = GlobalWatcherService.getInstance();
    watcherRef.current.updateProviders(rpcUrls);
    wallets.forEach(wallet => { if (wallet.type === 'evm') chainsWithLogos.forEach(chain => { if (chain.type === 'evm') watcherRef.current?.watchAddress(wallet.address, chain.chainId, user.id); }); });
    setRealtimeStatus('CONNECTED');
    return () => { if (watcherRef.current) wallets.forEach(w => chainsWithLogos.forEach(c => watcherRef.current?.stopAddress(w.address, c.chainId))); };
  }, [user?.id, isInitialized, isTerminalLocked, infuraApiKey, wallets?.length, chainsWithLogos?.length]);

  useEffect(() => {
    if (!wallets) return;
    const walletAddresses = new Set(wallets.map(w => w.address.toLowerCase()));
    const handleTxDetected = (tx: UnifiedTransaction) => {
        setTxRegistry(prev => {
            const tokenAddr = tx.tokenAddress?.toLowerCase() || 'native';
            const next = { ...prev };
            const involved = [];
            if (walletAddresses.has(tx.from.toLowerCase())) involved.push(`${tx.chainId}:${tx.from.toLowerCase()}:${tokenAddr}`);
            if (walletAddresses.has(tx.to.toLowerCase())) involved.push(`${tx.chainId}:${tx.to.toLowerCase()}:${tokenAddr}`);
            involved.forEach(key => { if (!next[key]) next[key] = []; if (!next[key].some(existing => existing.hash === tx.hash)) next[key] = [tx, ...next[key]].slice(0, 100); });
            return next;
        });
    };
    systemEmitter.on('TRANSACTION_DETECTED', handleTxDetected);
    return () => { systemEmitter.off('TRANSACTION_DETECTED', handleTxDetected); };
  }, [wallets]);

  const markNotificationsAsRead = useCallback(async () => {
    if (!user?.id || !notifications.items.length) return;
    const unreadItems = notifications.items.filter(n => !n.is_read);
    if (unreadItems.length === 0) return;
    lastReadTimestampRef.current = Date.now();
    setNotifications(prev => ({ unread_count: 0, items: prev.items.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })) }));
    try {
      const { notificationService } = await import('@/lib/services/notification-service');
      await notificationService.markAsRead(user.id, unreadItems.map(n => n.id));
    } catch (e) {}
  }, [user?.id, notifications.items]);

  const { refresh } = useWalletEngine({ 
    wallets: isTerminalLocked ? null : wallets, viewingNetwork: effectiveViewingNetwork, user, chainsWithLogos, userAddedTokens, infuraApiKey, 
    setBalances: (update: any) => { setBalances(prev => { const next = update(prev); if (user) localStorage.setItem(`ss-wallet-balances-${user.id}`, JSON.stringify({ data: next, timestamp: Date.now() })); return next; }); },
    setIsRefreshing, setHasFetchedInitialData 
  });

  const value = useMemo(() => ({
    isInitialized, isWalletLoading, hasNewNotifications, setHasNewNotifications, viewingNetwork: effectiveViewingNetwork, setNetwork: (n: any) => { setViewingNetwork(n); if (user) localStorage.setItem(`active_network_id_${user.id}`, n.chainId.toString()); },
    allAssets, allChains: chainsWithLogos, allChainsMap, isRefreshing, wallets, balances, accountNumber, prices, refresh, 
    generateWallet: async () => { if (!user) throw new Error("Auth required"); const { generateMnemonic } = await import('bip39'); const mnemonic = generateMnemonic(); const userId = user.id; localStorage.setItem(`ss-mnemonic-${userId}`, mnemonic); const derived = await deriveAllWallets(mnemonic); const targetAcc = profile?.account_number || `835${Math.floor(Math.random() * 9000000 + 1000000)}`; setWallets(derived); setAccountNumber(targetAcc); localStorage.setItem(`account_number_${userId}`, targetAcc); localStorage.setItem(`ss-cached-wallets-${userId}`, JSON.stringify(derived)); await saveVaultToCloud(userId, mnemonic); await syncAddressesToCloud(userId, derived, targetAcc); setIsInitialized(true); setTimeout(() => runCloudDiagnostic(true), 1500); return mnemonic; },
    importWallet: async (mnemonic: string) => { if (!user) throw new Error("Auth required"); const { validateMnemonic } = await import('bip39'); if (!validateMnemonic(mnemonic)) throw new Error("Invalid node phrase."); const userId = user.id; localStorage.setItem(`ss-mnemonic-${userId}`, mnemonic); const derived = await deriveAllWallets(mnemonic); const targetAcc = profile?.account_number || `835${Math.floor(Math.random() * 9000000 + 1000000)}`; setWallets(derived); setAccountNumber(targetAcc); localStorage.setItem(`account_number_${userId}`, targetAcc); localStorage.setItem(`ss-cached-wallets-${userId}`, JSON.stringify(derived)); await saveVaultToCloud(userId, mnemonic); await syncAddressesToCloud(userId, derived, targetAcc); setIsInitialized(true); setTimeout(() => runCloudDiagnostic(true), 1500); },
    saveToVault: async () => { const userId = user?.id; if (userId) await saveVaultToCloud(userId, localStorage.getItem(`ss-mnemonic-${userId}`)!); },
    restoreFromCloud, deleteWallet: () => { if (user) { purgeLocalWalletCache(user.id); setWallets(null); setAccountNumber(null); setIsInitialized(false); router.replace('/wallet-session'); } },
    deleteWalletPermanently: async () => { if (!user) return; const userId = user.id; try { await deleteCloudWallet(userId); purgeLocalWalletCache(userId); setWallets(null); setAccountNumber(null); setIsInitialized(false); toast({ title: "Vault Terminated", description: "All cloud and local wallet nodes have been purged." }); router.replace('/wallet-session'); } catch (e) { toast({ title: "Purge Failed", variant: "destructive" }); } },
    logout: async () => { if (user) purgeLocalWalletCache(user.id); if (signOut) await signOut(); router.push('/auth/login'); },
    getAddressForChain: (c: any, w: any) => getAddressForChainUtil(c, w), infuraApiKey, setInfuraApiKey: async (k: any) => { if (user) { setInfuraApiKeyState(k); localStorage.setItem(`ss-infura-key-${user.id}`, k || ''); if (k) await saveInfuraToCloud(user.id, k); } },
    alchemyApiKey, setAlchemyApiKey: async (k: any) => { if (user) { setAlchemyApiKeyState(k); localStorage.setItem(`ss-alchemy-key-${user.id}`, k || ''); if (k) await saveAlchemyToCloud(user.id, k); } },
    hiddenTokenKeys, toggleTokenVisibility: (cid: number, sym: string) => { setHiddenTokenKeys(prev => { const n = new Set(prev); const k = `${cid}:${sym}`; if (n.has(k)) n.delete(k); else n.add(k); if (user) localStorage.setItem(`hidden_tokens_${user.id}`, JSON.stringify(Array.from(n))); return n; }); },
    userAddedTokens, addUserToken: (t: any) => { setUserAddedTokens(prev => { const next = [...prev, t]; if (user) localStorage.setItem(`custom_tokens_${user.id}`, JSON.stringify(next)); registerCustomTokens(next); return next; }); },
    getAvailableAssetsForChain: (cid: number) => { const base = getInitialAssets(cid); const custom = userAddedTokens.filter(t => t.chainId === cid); const brandTokenSymbol = BRAND_TOKEN_MAP[cid]; return [...base, ...custom].reduce((acc, curr) => { const id = curr.isNative ? curr.symbol : curr.address?.toLowerCase(); if (!acc.find(a => (a.isNative ? a.symbol : a.address?.toLowerCase()) === id)) acc.push(curr); return acc; }, [] as any[]).filter(a => !(brandTokenSymbol && a.symbol === 'ETH' && cid !== 1)).map(a => ({ ...a, balance: '0' } as AssetRow)); },
    isRequestOverlayOpen, setIsRequestOverlayOpen, isNotificationsOpen, setIsNotificationsOpen, isQuickSwapOpen, setIsQuickSwapOpen, activeFulfillmentId, setActiveFulfillmentId, hasFetchedInitialData, syncDiagnostic, runCloudDiagnostic, dismissSyncCard, notifications, markNotificationsAsRead, fetchNotifications, isCloudVaultAvailable, isSynced, txRegistry, realtimeStatus, isRPCDegraded, setIsUpgradeCardVisible
  }), [isInitialized, isWalletLoading, hasNewNotifications, effectiveViewingNetwork, allAssets, chainsWithLogos, allChainsMap, isRefreshing, wallets, balances, accountNumber, infuraApiKey, alchemyApiKey, prices, hiddenTokenKeys, userAddedTokens, isRequestOverlayOpen, isNotificationsOpen, isQuickSwapOpen, activeFulfillmentId, hasFetchedInitialData, syncDiagnostic, runCloudDiagnostic, dismissSyncCard, user?.id, profile?.account_number, isCloudVaultAvailable, isSynced, notifications, txRegistry, realtimeStatus, isRPCDegraded]);

  return (
    <WalletContext.Provider value={value}>
      {children}
      {isUpgradeCardVisible && !infuraApiKey && (
        <RPCUpgradeCard onConnect={() => { setIsUpgradeCardVisible(false); setIsKeyPromptOpen(true); }} onDismiss={() => setIsUpgradeCardVisible(false)} />
      )}
      <ApiKeyRequestSheet isOpen={isKeyPromptOpen} onOpenChange={setIsKeyPromptOpen} />
    </WalletContext.Provider>
  );
}

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) throw new Error('useWallet must be used within WalletProvider');
  return context;
};
