'use client';

import React, { createContext, useContext, useState, ReactNode, useMemo, useEffect, useCallback, useRef } from 'react';
import type { AssetRow, ChainConfig, WalletWithMetadata, Notification } from '@/lib/types';
import { useNetworkLogos } from '@/hooks/useNetworkLogos';
import { useUser } from './user-provider';
import { useMarket } from './market-provider';
import { useWalletEngine } from '@/contexts/hooks/useWalletEngine';
import { deriveAllWallets } from '@/lib/wallets/derive';
import { getAddressForChain as getAddressForChainUtil } from '@/lib/wallets/utils';
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
import { useRealtimeGateway } from '@/hooks/useRealtimeGateway';
import { systemEmitter } from '@/lib/events/systemEmitter';

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
  markNotificationsAsRead: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  isCloudVaultAvailable: boolean;
  isSynced: boolean;
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
  const router = useRouter();
  const { toast } = useToast();
  const { chainsWithLogos, allChainsMap } = useNetworkLogos();
  const { user, profile, loading: authLoading, signOut, refreshProfile, isTerminalLocked } = useUser();
  const { prices, registerCustomTokens } = useMarket();

  const [isRequestOverlayOpen, setIsRequestOverlayOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isQuickSwapOpen, setIsQuickSwapOpen] = useState(false);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const [activeFulfillmentId, setActiveFulfillmentId] = useState<string | null>(null);

  const [viewingNetwork, setViewingNetwork] = useState<ChainConfig | null>(null);

  const [notifications, setNotifications] = useState({
    unread_count: 0,
    items: [] as Notification[]
  });

  console.log("[DEBUG] WalletProvider: Rendering...");
  const effectiveViewingNetwork = useMemo(() => {
    console.log("[DEBUG] WalletProvider: Calculating effectiveViewingNetwork...");
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

  const [wallets, setWallets] = useState<WalletWithMetadata[] | null>(null);
  const [accountNumber, setAccountNumber] = useState<string | null>(null);
  const [balances, setBalances] = useState<{ [key: string]: AssetRow[] }>({});
  const [infuraApiKey, setInfuraApiKeyState] = useState<string | null>(null);
  const [alchemyApiKey, setAlchemyApiKeyState] = useState<string | null>(null);
  const [userAddedTokens, setUserAddedTokens] = useState<AssetRow[]>([]);
  const [hiddenTokenKeys, setHiddenTokenKeys] = useState<Set<string>>(new Set());

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasFetchedInitialData, setHasFetchedInitialData] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [syncDiagnostic, setSyncDiagnostic] = useState<SyncDiagnostic>({
    status: 'idle',
    chain: null,
    localValue: null,
    cloudValue: null,
    progress: 0
  });

  const syncAbortControllerRef = useRef<AbortController | null>(null);
  const isSyncingRef = useRef(false);
  const subscriptionRef = useRef<any>(null);
  const listenerRef = useRef<BlockchainListenerService | null>(null);
  const lastReadTimestampRef = useRef<number>(0);
  const highestBlockRef = useRef<{ [chain: string]: number }>({});

  const isCloudVaultAvailable = !!profile?.vault_phrase;

  /**
   * ADAPTIVE SYNC AUDIT
   * Version: 2.0.0 (Address Matching Node)
   */
  const isSynced = useMemo(() => {
    if (!profile || !wallets || !isInitialized) return true;

    // Check primary EVM node
    const evmLocal = wallets.find(w => w.type === 'evm')?.address;
    if (evmLocal && profile.evm_address !== evmLocal) return false;

    // Check Solana node
    const solLocal = wallets.find(w => w.type === 'solana')?.address;
    if (solLocal && profile.solana_address !== solLocal) return false;

    // Check BTC node
    const btcLocal = wallets.find(w => w.type === 'btc')?.address;
    if (btcLocal && profile.btc_address !== btcLocal) return false;

    return true;
  }, [profile, wallets, isInitialized]);

  const primaryEvmAddress = useMemo(() => wallets?.find(w => w.type === 'evm')?.address || null, [wallets]);
  useRealtimeGateway(isInitialized && !isTerminalLocked ? primaryEvmAddress : null);


  const runCloudDiagnostic = useCallback(async (force = false) => {
    const userId = user?.id;
    const hasMnemonic = userId && !!localStorage.getItem(`ss-mnemonic-${userId}`);

    if (!userId || !wallets?.length || !accountNumber || !chainsWithLogos.length || isTerminalLocked || !hasMnemonic) {
      return;
    }

    const sessionKey = `ss-sync-lock-${userId}`;
    const alreadySyncedInSession = typeof window !== 'undefined' && sessionStorage.getItem(sessionKey);

    if (!force && alreadySyncedInSession) {
      return;
    }

    if (isSyncingRef.current) return;

    if (syncAbortControllerRef.current) syncAbortControllerRef.current.abort();
    syncAbortControllerRef.current = new AbortController();
    const signal = syncAbortControllerRef.current.signal;

    isSyncingRef.current = true
   try {
      await refreshProfile();
      await backgroundSyncWorker.performCloudAudit(
        userId, 
        wallets, 
        profile || null, 
        accountNumber, 
        chainsWithLogos, 
        (update) => setSyncDiagnostic(prev => ({ ...prev, ...update })), 
        () => signal.aborted
      );

      if (typeof window !== 'undefined' && !signal.aborted) {
        sessionStorage.setItem(sessionKey, 'true');
      }
    } finally {
      isSyncingRef.current = false;
    }
  }, [user?.id, wallets, profile, accountNumber, chainsWithLogos, isTerminalLocked, refreshProfile]);

  const dismissSyncCard = useCallback(() => {
    if (syncAbortControllerRef.current) syncAbortControllerRef.current.abort();
    isSyncingRef.current = false;
    setSyncDiagnostic({ status: 'idle', chain: null, localValue: null, cloudValue: null, progress: 0 });
  }, []);

  useEffect(() => {
    if (!user?.id || !supabase) return;

    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    const channel = supabase
      .channel(`vault-registry-sync-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const oldPhrase = payload.old?.vault_phrase;
          const newPhrase = payload.new?.vault_phrase;

          if (newPhrase && newPhrase !== oldPhrase) {
            runCloudDiagnostic(true);
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [user?.id, runCloudDiagnostic]);

  useEffect(() => {
    if (authLoading || !user || !profile) return;

    const userId = user.id;
    const localInfura = localStorage.getItem(`ss-infura-key-${userId}`);
    const localAlchemy = localStorage.getItem(`ss-alchemy-key-${userId}`);

    const attemptKeyRecovery = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        if (!localInfura && profile.vault_infura_key && profile.infura_iv) {
          const key = await decryptValueFromServer(profile.vault_infura_key, profile.infura_iv);
          setInfuraApiKeyState(key);
          localStorage.setItem(`ss-infura-key-${userId}`, key);
        }
        if (!localAlchemy && profile.vault_alchemy_key && profile.alchemy_iv) {
          const key = await decryptValueFromServer(profile.vault_alchemy_key, profile.alchemy_iv);
          setAlchemyApiKeyState(key);
          localStorage.setItem(`ss-alchemy-key-${userId}`, key);
        }
      } catch (e) {
        console.warn("[VAULT_RECOVERY_ADVISORY] Background key sync deferred.");
      }
    };

    attemptKeyRecovery();
  }, [user?.id, profile, authLoading]);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setWallets(null);
      setAccountNumber(null);
      setBalances({});
      setInfuraApiKeyState(null);
      setAlchemyApiKeyState(null);
      setUserAddedTokens([]);
      setHiddenTokenKeys(new Set());
      setIsInitialized(false);
      setIsWalletLoading(false);
      return;
    }
        const userId = user.id;
    setIsWalletLoading(true);
    const savedMnemonic = localStorage.getItem(`ss-mnemonic-${userId}`);
    if (!savedMnemonic) {
      setWallets(null);
      setAccountNumber(null);
      setIsInitialized(false);
      setIsWalletLoading(false);
      return;
    }

    const savedWallets = localStorage.getItem(`ss-cached-wallets-${userId}`);
    if (savedWallets) {
      try { setWallets(JSON.parse(savedWallets)); } catch(e) {}
    } else {
      deriveAllWallets(savedMnemonic).then(derived => {
        setWallets(derived);
        localStorage.setItem(`ss-cached-wallets-${userId}`, JSON.stringify(derived));
      });
    }

    const savedAcc = localStorage.getItem(`account_number_${userId}`);
    setAccountNumber(savedAcc);

    const savedBals = localStorage.getItem(`ss-wallet-balances-${userId}`);
    if (savedBals) {
      try { 
        const { data } = JSON.parse(savedBals);
        setBalances(data || {});
      } catch(e) {}
    }
const savedInfura = localStorage.getItem(`ss-infura-key-${userId}`);
    if (savedInfura) setInfuraApiKeyState(savedInfura);

    const savedAlchemy = localStorage.getItem(`ss-alchemy-key-${userId}`);
    if (savedAlchemy) setAlchemyApiKeyState(savedAlchemy);
const savedTokens = localStorage.getItem(`custom_tokens_${userId}`);
    if (savedTokens) {
      try { 
        const parsed = JSON.parse(savedTokens);
        setUserAddedTokens(parsed);
        registerCustomTokens(parsed);
      } catch(e) {}
    }

    const savedHidden = localStorage.getItem(`hidden_tokens_${userId}`);
    if (savedHidden) {
      try { setHiddenTokenKeys(new Set(JSON.parse(savedHidden))); } catch(e) {}
    }

    setIsInitialized(true);
    setIsWalletLoading(false);
  }, [user?.id, authLoading, registerCustomTokens]);


  const allAssets = useMemo(() => {
    if (!isInitialized || !effectiveViewingNetwork) return [];

    const base = getInitialAssets(effectiveViewingNetwork.chainId);
    const custom = userAddedTokens.filter(t => t.chainId === effectiveViewingNetwork.chainId);

    const registry = [...base, ...custom].reduce((acc, curr) => {
      const id = curr.isNative ? curr.symbol : curr.address?.toLowerCase();
      if (!acc.find(a => (a.isNative ? a.symbol : a.address?.toLowerCase()) === id)) {
        acc.push(curr);
      }
      return acc;
    }, [] as AssetRow[]);

    const wncPrice = prices['internal:wnc']?.price || 0.0006;
    const wncAsset = { 
      chainId: effectiveViewingNetwork.chainId, 
      address: 'internal:wnc', 
      symbol: 'WNC', 
      name: 'Wevinacoin', 
      balance: profile?.wnc_earnings?.toString() || '0', 
      isNative: false, 
      priceUsd: wncPrice, 
      fiatValueUsd: (profile?.wnc_earnings || 0) * wncPrice, 
      pctChange24h: prices['internal:wnc']?.change || 0, 
      decimals: 0,
      iconUrl: WNC_LOGO_URL
    } as AssetRow;

    const chainBalances = balances[effectiveViewingNetwork.chainId] || [];
    const brandTokenSymbol = BRAND_TOKEN_MAP[effectiveViewingNetwork.chainId];

    const mappedAssets = registry.map(asset => {
      const balDoc = chainBalances.find(b => asset.isNative ? b.symbol === asset.symbol : b.address?.toLowerCase() === asset.address?.toLowerCase());
      const pId = (asset.priceId || asset.coingeckoId || asset.address || '').toLowerCase();
      const p = prices[pId];
      const livePrice = p?.price || 0;

      return { 
        ...asset, 
        balance: balDoc?.balance || '0', 
        priceUsd: livePrice, 
        fiatValueUsd: parseFloat(balDoc?.balance || '0') * livePrice, 
        pctChange24h: p?.change || 0,
        iconUrl: (asset.symbol === 'WNC' || asset.name === 'Wevinacoin') ? WNC_LOGO_URL : asset.iconUrl
      } as AssetRow;
    });

    return [wncAsset, ...mappedAssets]
      .filter(a => {
        if (brandTokenSymbol && a.symbol === 'ETH' && effectiveViewingNetwork.chainId !== 1) {
          return false; 
        }
        const key = `${effectiveViewingNetwork.chainId}:${a.symbol}`;
        const isHidden = hiddenTokenKeys.has(key);
        const isUserAdded = userAddedTokens.some(t => t.chainId === effectiveViewingNetwork.chainId && t.symbol === a.symbol);
        if (a.symbol === 'WNC' || a.isNative || a.symbol === brandTokenSymbol) return !isHidden;
        return isUserAdded && !isHidden;
      })
      .sort((a, b) => {
        if (a.symbol === 'WNC') return -1;
        if (b.symbol === 'WNC') return 1;
        if (a.symbol === brandTokenSymbol) return -1;
        if (b.symbol === brandTokenSymbol) return 1;
        return (b.fiatValueUsd || 0) - (a.fiatValueUsd || 0);
      });
  }, [isInitialized, effectiveViewingNetwork, profile?.wnc_earnings, balances, prices, hiddenTokenKeys, userAddedTokens]);

  const fetchNotifications = useCallback(async () => {
    if (!user || !supabase || isTerminalLocked) return;

    // 🛡️ STALE DATA GUARD: Block redundant fetching immediately after mark-as-read
    if (Date.now() - lastReadTimestampRef.current < 4000) return;

    try {
      // Direct query to ensure is_read is handled correctly
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        const unreadCount = data.filter(n => !n.is_read).length;
        setNotifications({
          unread_count: unreadCount,
          items: data as Notification[]
        });
      }
    } catch (e) {
      console.warn("[NOTIFICATION_FETCH_FAIL]");
    }
  }, [user?.id, isTerminalLocked]);

  useEffect(() => {
    if (!user?.id || !supabase || isTerminalLocked || !wallets) return;

    fetchNotifications();

    // ⚡ PRODUCTION REALTIME: Listen for all notification changes for the user
    const channel = supabase
      .channel(`user-notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen for INSERT and UPDATE (for is_read changes)
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newItem = payload.new as Notification;
            setNotifications(prev => {
              const exists = prev.items.some(n => n.id === newItem.id);
              if (exists) return prev;
              return {
                unread_count: prev.unread_count + 1,
                items: [newItem, ...prev.items]
              };
            });

toast({
              title: `🔔 ${newItem.title || 'New Notification'}`,
              description: newItem.message || "New activity detected in your registry node.",
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedItem = payload.new as Notification;
            setNotifications(prev => ({
              unread_count: prev.items.filter(n => (n.id === updatedItem.id ? updatedItem.is_read : n.is_read) === false).length,
              items: prev.items.map(n => n.id === updatedItem.id ? updatedItem : n)
            }));
          }
        }
      )
      .subscribe();

    // 📡 BLOCKCHAIN WATCHER INTEGRATION
    const rpcUrls: Record<number, string> = {};
    chainsWithLogos.forEach(c => {
      if (c.rpcUrl && c.type === 'evm') {
        rpcUrls[c.chainId] = c.rpcUrl.replace('{API_KEY}', infuraApiKey || '');
      }
    });

    if (!listenerRef.current) {
      listenerRef.current = new BlockchainListenerService(rpcUrls);
    }

    // Start watching primary EVM address
    const evmAddress = wallets.find(w => w.type === 'evm')?.address;
    if (evmAddress && effectiveViewingNetwork.type === 'evm') {
      listenerRef.current.watchWallet(evmAddress, effectiveViewingNetwork.chainId, user.id);
    }

    return () => {
      supabase.removeChannel(channel);
      if (listenerRef.current) {
        listenerRef.current.stopAll();
      }
    };
  }, [user?.id, isTerminalLocked, fetchNotifications, toast, wallets, chainsWithLogos, infuraApiKey, effectiveViewingNetwork]);
    const markNotificationsAsRead = useCallback(async () => {
    if (!user?.id || !notifications.items.length) return;
    const unreadItems = notifications.items.filter(n => !n.is_read);
    if (unreadItems.length === 0) return;

    // 1. TIMESTAMP: Block re-fetches for 4s during DB sync
    lastReadTimestampRef.current = Date.now();

    // 2. OPTIMISTIC CLEAR: Update local state instantly
    setNotifications(prev => ({
      unread_count: 0,
      items: prev.items.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
    }));

    try {
      const { notificationService } = await import('@/lib/services/notification-service');
      const unreadIds = unreadItems.map(n => n.id);
      await notificationService.markAsRead(user.id, unreadIds);
    } catch (e) {
      console.warn("[MARK_READ_FAIL]");
    }
  }, [user?.id, notifications.items]);

  const handleSetBalances = useCallback((update: (prev: any) => any) => {
    setBalances(prev => {
      const next = update(prev);
      if (user) localStorage.setItem(`ss-wallet-balances-${user.id}`, JSON.stringify({ data: next, timestamp: Date.now() }));
      return next;
    });
  }, [user?.id]);

  const { refresh } = useWalletEngine({ 
    wallets: isTerminalLocked ? null : wallets, 
    viewingNetwork: effectiveViewingNetwork, 
    user, 
    chainsWithLogos, 
    userAddedTokens, 
    infuraApiKey,
    alchemyApiKey,
    setBalances: handleSetBalances, 
    setIsRefreshing, 
    setHasFetchedInitialData 
  });

  const generateWallet = useCallback(async (): Promise<string> => {
    if (!user) throw new Error("Auth required");
    const { generateMnemonic } = await import('bip39');
    const mnemonic = generateMnemonic();

    const userId = user.id;
    localStorage.setItem(`ss-mnemonic-${userId}`, mnemonic);

    const derived = await deriveAllWallets(mnemonic);
    const targetAcc = profile?.account_number || `835${Math.floor(Math.random() * 9000000 + 1000000)}`;

    setWallets(derived);
    setAccountNumber(targetAcc);
    localStorage.setItem(`account_number_${userId}`, targetAcc);
    localStorage.setItem(`ss-cached-wallets-${userId}`, JSON.stringify(derived));

    await saveVaultToCloud(userId, mnemonic);
    await syncAddressesToCloud(userId, derived, targetAcc);

    setIsInitialized(true);
    setTimeout(() => runCloudDiagnostic(true), 1500);
    return mnemonic;
  }, [user?.id, profile?.account_number, runCloudDiagnostic]);

  const importWallet = useCallback(async (mnemonic: string) => {
    if (!user) throw new Error("Auth required");
    const { validateMnemonic } = await import('bip39');
    if (!validateMnemonic(mnemonic)) throw new Error("Invalid node phrase.");

    const userId = user.id;
    localStorage.setItem(`ss-mnemonic-${userId}`, mnemonic);

    const derived = await deriveAllWallets(mnemonic);
    const targetAcc = profile?.account_number || `835${Math.floor(Math.random() * 9000000 + 1000000)}`;

    setWallets(derived);
    setAccountNumber(targetAcc);
    localStorage.setItem(`account_number_${userId}`, targetAcc);
    localStorage.setItem(`ss-cached-wallets-${userId}`, JSON.stringify(derived));await saveVaultToCloud(userId, mnemonic);
    await syncAddressesToCloud(userId, derived, targetAcc);
    setIsInitialized(true);
    setTimeout(() => runCloudDiagnostic(true), 1500);
  }, [user?.id, profile?.account_number, runCloudDiagnostic]);

  const restoreFromCloud = useCallback(async (onStatusUpdate?: (status: string) => void) => {
    if (!user || !profile?.vault_phrase) throw new Error("Vault node not found in cloud registry.");
    const userId = user.id;

    if (onStatusUpdate) onStatusUpdate('Decrypting Vault...');
    try {
      const mnemonic = await decryptValueFromServer(profile.vault_phrase, profile.iv || '');

      if (onStatusUpdate) onStatusUpdate('Re-calculating Nodes...');
      const derived = await deriveAllWallets(mnemonic);
      const targetAcc = profile.account_number || `835${Math.floor(Math.random() * 9000000 + 1000000)}`;

      localStorage.setItem(`ss-mnemonic-${userId}`, mnemonic);
      setWallets(derived);
      setAccountNumber(targetAcc);
      localStorage.setItem(`account_number_${userId}`, targetAcc);
      localStorage.setItem(`ss-cached-wallets-${userId}`, JSON.stringify(derived));

      await syncAddressesToCloud(userId, derived, targetAcc);

      if (profile.vault_infura_key && profile.infura_iv) {
        const key = await decryptValueFromServer(profile.vault_infura_key, profile.infura_iv);
        setInfuraApiKeyState(key);
        localStorage.setItem(`ss-infura-key-${userId}`, key);
      }
      if (profile.vault_alchemy_key && profile.alchemy_iv) {
        const key = await decryptValueFromServer(profile.vault_alchemy_key, profile.alchemy_iv);
        setAlchemyApiKeyState(key);
        localStorage.setItem(`ss-alchemy-key-${userId}`, key);
      }

      setIsInitialized(true);
      setTimeout(() => runCloudDiagnostic(true), 1000);
    } catch (e: any) { throw e; }
  }, [user?.id, profile, runCloudDiagnostic]);

  const logout = useCallback(async () => {
    setIsLoggingOut(true);
    const userId = user?.id;
    try {
      if (userId) purgeLocalWalletCache(userId);
      if (signOut) await signOut();
      router.push('/auth/login');
    } catch (e) {
      router.push('/auth/login');
    } finally {
      setIsLoggingOut(false);
    }
  }, [user?.id, signOut, router]);

  useEffect(() => {
    if (isInitialized && wallets && user && chainsWithLogos.length > 0 && accountNumber && !isLoggingOut && !isTerminalLocked) {
      runCloudDiagnostic();
    }
  }, [isInitialized, wallets, user?.id, chainsWithLogos, accountNumber, isLoggingOut, isTerminalLocked, runCloudDiagnostic]);

  const setNetwork = useCallback((n: any) => { 
    setViewingNetwork(n); 
    if (user) localStorage.setItem(`active_network_id_${user.id}`, n.chainId.toString()); 
  }, [user?.id]);

  const toggleTokenVisibility = useCallback((cid: number, sym: string) => { 
    setHiddenTokenKeys(prev => { 
      const n = new Set(prev); 
      const k = `${cid}:${sym}`; 
      if (n.has(k)) n.delete(k); 
      else n.add(k); 
      if (user) localStorage.setItem(`hidden_tokens_${user.id}`, JSON.stringify(Array.from(n))); 
      return n; 
    }); 
  }, [user?.id]);

  const addUserToken = useCallback((t: any) => { 
    setUserAddedTokens(prev => { 
      const next = [...prev, t]; 
      if (user) localStorage.setItem(`custom_tokens_${user.id}`, JSON.stringify(next)); 
      registerCustomTokens(next); 
      return next; 
    }); 
  }, [user?.id, registerCustomTokens]);

  const setInfuraApiKey = useCallback(async (k: any) => { 
    if (user) { 
      const userId = user.id;
      setInfuraApiKeyState(k); 
      localStorage.setItem(`ss-infura-key-${userId}`, k || ''); 
      if (k) await saveInfuraToCloud(userId, k); 
    } 
  }, [user?.id]);

  const setAlchemyApiKey = useCallback(async (k: any) => { 
    if (user) { 
      const userId = user.id;
      setAlchemyApiKeyState(k); 
      localStorage.setItem(`ss-alchemy-key-${userId}`, k || ''); 
      if (k) await saveAlchemyToCloud(userId, k); 
    } 
  }, [user?.id]);

  useEffect(() => {
    const handleBalanceUpdated = (payload: any) => {
      // payload format: { chain: string, tokenAddress: string, balance: string, blockNumber: number }
      const chainKey = payload.chain || (effectiveViewingNetwork ? effectiveViewingNetwork.chainId.toString() : 'unknown');

      // Stale Block Guard
      const currentHighest = highestBlockRef.current[chainKey] || 0;
      if (payload.blockNumber && payload.blockNumber < currentHighest) {
                 console.warn(`[STATE_GUARD] Rejected stale balance update for ${chainKey}. Received: ${payload.blockNumber}, Current: ${currentHighest}`);
         return;
      }

      if (payload.blockNumber) {
         highestBlockRef.current[chainKey] = payload.blockNumber;
      }

      setBalances(prev => {
        const next = { ...prev };
        // For Phase 1, we find the chain context or default to effectiveViewingNetwork
        const chainId = Object.keys(next).find(k => k === chainKey) || chainKey;
        if (chainId && next[chainId]) {
          next[chainId] = next[chainId].map(asset => {
             const tokenMatch = payload.tokenAddress || payload.token; // fallback if older payload
             if (tokenMatch && (asset.symbol === tokenMatch || asset.address?.toLowerCase() === tokenMatch.toLowerCase())) {
                return { ...asset, balance: payload.balance };
             }
             return asset;
          });
        }
        return next;
      });
    };
const handleNotification = (payload: any) => {
       setNotifications(prev => {
         const exists = prev.items.some(n => n.id === payload.id);
         if (exists) return prev;
         return {
           unread_count: prev.unread_count + 1,
           items: [payload, ...prev.items]
         };
       });
    };

    systemEmitter.on('BALANCE_UPDATED', handleBalanceUpdated);
    systemEmitter.on('NOTIFICATION', handleNotification);

    return () => {
      systemEmitter.off('BALANCE_UPDATED', handleBalanceUpdated);
      systemEmitter.off('NOTIFICATION', handleNotification);
    };
  }, [effectiveViewingNetwork]);

  const contextValue = useMemo(() => ({
    isInitialized,
    isWalletLoading,
    hasNewNotifications,
    setHasNewNotifications,
    viewingNetwork: effectiveViewingNetwork,
    setNetwork,
    allAssets,
    allChains: chainsWithLogos,
    allChainsMap,
    isRefreshing,
    wallets,
    balances,
    accountNumber,
    prices,
    refresh,
    generateWallet,
    importWallet,
    saveToVault: async () => {
        const userId = user?.id;
        if (userId) await saveVaultToCloud(userId, localStorage.getItem(`ss-mnemonic-${userId}`)!);
    },
    restoreFromCloud,
    deleteWallet: () => { 
        if (user) { 
            purgeLocalWalletCache(user.id); 
            setWallets(null); 
            setAccountNumber(null); 
            setIsInitialized(false);
            router.replace('/wallet-session'); 
        } 
    },
    deleteWalletPermanently: async () => {
        if (!user) return;
        const userId = user.id;
        try {
            await deleteCloudWallet(userId);
            purgeLocalWalletCache(userId);
            setWallets(null);
            setAccountNumber(null);
            setIsInitialized(false);

            toast({
                title: "Vault Terminated",
                description: "All cloud and local wallet nodes have been purged.",
            });

            router.replace('/wallet-session');
        } catch (e) {
            toast({
                title: "Purge Failed",
                description: "Could not fully decommission vault. Try again.",
                variant: "destructive"
            });
        }
    },
    logout,
    getAddressForChain: (c: any, w: any) => getAddressForChainUtil(c, w),
    infuraApiKey,
    setInfuraApiKey,
    alchemyApiKey,
    setAlchemyApiKey,
    hiddenTokenKeys,
    toggleTokenVisibility,
    userAddedTokens,
    addUserToken, 
    getAvailableAssetsForChain: (cid: number) => {
        const base = getInitialAssets(cid);
        const custom = userAddedTokens.filter(t => t.chainId === cid);
        const brandTokenSymbol = BRAND_TOKEN_MAP[cid];
        return [...base, ...custom].reduce((acc, curr) => {
            const id = curr.isNative ? curr.symbol : curr.address?.toLowerCase();
            if (!acc.find(a => (a.isNative ? a.symbol : a.address?.toLowerCase()) === id)) acc.push(curr);
            return acc;
        }, [] as any[])
        .filter(a => !(brandTokenSymbol && a.symbol === 'ETH' && cid !== 1))
        .map(a => ({ ...a, balance: '0' } as AssetRow));
    }, 
    isRequestOverlayOpen,
    setIsRequestOverlayOpen,
    isNotificationsOpen,
    setIsNotificationsOpen,
    isQuickSwapOpen,
    setIsQuickSwapOpen,
    activeFulfillmentId,
    setActiveFulfillmentId,
    hasFetchedInitialData,
    syncDiagnostic,
    runCloudDiagnostic,
    dismissSyncCard,
    notifications,
    markNotificationsAsRead,
    fetchNotifications,
    isCloudVaultAvailable,
    isSynced
  }), [isInitialized, isWalletLoading, hasNewNotifications, effectiveViewingNetwork, setNetwork, allAssets, chainsWithLogos, allChainsMap, isRefreshing, wallets, balances, accountNumber, infuraApiKey, setInfuraApiKey, alchemyApiKey, setAlchemyApiKey, prices, hiddenTokenKeys, toggleTokenVisibility, userAddedTokens, addUserToken, isRequestOverlayOpen, isNotificationsOpen, isQuickSwapOpen, activeFulfillmentId, setActiveFulfillmentId, hasFetchedInitialData, syncDiagnostic, runCloudDiagnostic, dismissSyncCard, user?.id, router, refresh, generateWallet, importWallet, restoreFromCloud, logout, notifications, markNotificationsAsRead, fetchNotifications, isTerminalLocked, isCloudVaultAvailable, isSynced]);

  return <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>;
}

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (context === undefined) throw new Error('useWallet must be used within WalletProvider');
  return context;
};
