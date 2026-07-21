'use client';

import { supabase } from '@/lib/supabase/client';
import type { WalletWithMetadata } from '@/lib/types';
import { registryDb } from '@/lib/storage/registry-db';

/**
 * INSTITUTIONAL WALLET ACTIONS SERVICE
 * Version: 19.1.0 (BCH Sync Standard)
 */

/**
 * Synchronizes hardware addresses to the cloud registry.
 * Hardened to catch database schema mismatches (Missing Columns).
 */
export async function syncAddressesToCloud(
  userId: string,
  wallets: WalletWithMetadata[],
  accountNumber: string
) {
  if (!supabase || !userId) return;

  try {
    const payload = { 
      account_number: accountNumber, 
      updated_at: new Date().toISOString(),
      evm_address: wallets.find(w => w.type === 'evm')?.address,
      xrp_address: wallets.find(w => w.type === 'xrp')?.address,
      polkadot_address: wallets.find(w => w.type === 'polkadot')?.address,
      kusama_address: wallets.find(w => w.type === 'kusama')?.address,
      near_address: wallets.find(w => w.type === 'near')?.address,
      solana_address: wallets.find(w => w.type === 'solana')?.address,
      btc_address: wallets.find(w => w.type === 'btc')?.address,
      ltc_address: wallets.find(w => w.type === 'ltc')?.address,
      doge_address: wallets.find(w => w.type === 'doge')?.address,
      cosmos_address: wallets.find(w => w.type === 'cosmos')?.address,
      osmosis_address: wallets.find(w => w.type === 'osmosis')?.address,
      secret_address: wallets.find(w => w.type === 'secret')?.address,
      injective_address: wallets.find(w => w.type === 'injective')?.address,
      celestia_address: wallets.find(w => w.type === 'celestia')?.address,
      cardano_address: wallets.find(w => w.type === 'cardano')?.address,
      tron_address: wallets.find(w => w.type === 'tron')?.address,
      algorand_address: wallets.find(w => w.type === 'algorand')?.address,
      hedera_address: wallets.find(w => w.type === 'hedera')?.address,
      tezos_address: wallets.find(w => w.type === 'tezos')?.address,
      aptos_address: wallets.find(w => w.type === 'aptos')?.address,
      sui_address: wallets.find(w => w.type === 'sui')?.address,
      starknet_address: wallets.find(w => w.type === 'starknet')?.address,
      bep2_address: wallets.find(w => w.type === 'bep2')?.address,
      bch_address: wallets.find(w => w.type === 'bitcoin-cash')?.address,
    };

    const { error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', userId);

    if (error) {
      // Return specific error code to the background sync worker
      if (error.code === '42703') {
          throw new Error(`MISSING_COLUMN: ${error.message}`);
      }
      throw error;
    }
  } catch (e: any) {
    console.error("[REGISTRY_SYNC_FAIL]", e.message);
    throw e;
  }
}

/**
 * Removes all wallet-related data from the cloud registry for a specific user.
 */
export async function deleteCloudWallet(userId: string) {
  if (!supabase || !userId) return;

  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        vault_phrase: null,
        iv: null,
        vault_infura_key: null,
        infura_iv: null,
        vault_alchemy_key: null,
        alchemy_iv: null,
        account_number: null,
        evm_address: null,
        xrp_address: null,
        polkadot_address: null,
        kusama_address: null,
        near_address: null,
        solana_address: null,
        btc_address: null,
        ltc_address: null,
        doge_address: null,
        cosmos_address: null,
        osmosis_address: null,
        secret_address: null,
        injective_address: null,
        celestia_address: null,
        cardano_address: null,
        tron_address: null,
        algorand_address: null,
        hedera_address: null,
        tezos_address: null,
        aptos_address: null,
        sui_address: null,
        starknet_address: null,
        bep2_address: null,
        bch_address: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) throw error;
  } catch (e: any) {
    console.error("Cloud Registry Purge Failed:", e.message);
    throw e;
  }
}

/**
 * Decrypts a sensitive value from the server registry.
 */
export async function decryptValueFromServer(encrypted: string, iv: string): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("UNAUTHORIZED_SESSION");

  const res = await fetch('/api/wallet/decrypt-phrase', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({ encrypted, iv })
  });

  if (!res.ok) throw new Error("Decryption protocol failed.");
  const { text } = await res.json();
  return text;
}

/**
 * Backup the encrypted mnemonic to the cloud.
 */
export async function saveVaultToCloud(userId: string, mnemonic: string) {
  if (!supabase || !userId) return false;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return false;

    const res = await fetch('/api/wallet/encrypt-phrase', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${session?.access_token}` 
      },
      body: JSON.stringify({ text: mnemonic })
    });
    
    if (res.ok) {
      const data = await res.json();
      const { error } = await supabase.from('profiles').update({
        vault_phrase: data.encrypted,
        iv: data.iv,
        updated_at: new Date().toISOString()
      }).eq('id', userId);
      
      if (error) throw error;
      return true;
    }
    return false;
  } catch (e) {
    console.error("Vault Backup Advisory:", e);
    return false;
  }
}

/**
 * Backup the encrypted Infura API key to the cloud.
 */
export async function saveInfuraToCloud(userId: string, apiKey: string) {
  if (!supabase || !userId) return false;
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("UNAUTHORIZED_SESSION");

    const res = await fetch('/api/wallet/encrypt-phrase', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${session.access_token}` 
      },
      body: JSON.stringify({ text: apiKey })
    });
    
    if (res.ok) {
      const data = await res.json();
      const { error } = await supabase.from('profiles').update({
        vault_infura_key: data.encrypted,
        infura_iv: data.iv,
        updated_at: new Date().toISOString()
      }).eq('id', userId);
      
      if (error) throw error;
      return true;
    }
    return false;
  } catch (e: any) {
    console.warn("[SYNC_ADVISORY] Infura cloud backup deferred:", e.message);
    return false;
  }
}

/**
 * Backup the encrypted Alchemy API key to the cloud.
 */
export async function saveAlchemyToCloud(userId: string, apiKey: string) {
  if (!supabase || !userId) return false;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error("UNAUTHORIZED_SESSION");

    const res = await fetch('/api/wallet/encrypt-phrase', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${session.access_token}` 
      },
      body: JSON.stringify({ text: apiKey })
    });
    
    if (res.ok) {
      const data = await res.json();
      const { error } = await supabase.from('profiles').update({
        vault_alchemy_key: data.encrypted,
        alchemy_iv: data.iv,
        updated_at: new Date().toISOString()
      }).eq('id', userId);
      
      if (error) throw error;
      return true;
    }
    return false;
  } catch (e: any) {
    console.warn("[SYNC_ADVISORY] Alchemy cloud backup deferred:", e.message);
    return false;
  }
}

/**
 * INSTITUTIONAL PURGE HANDSHAKE
 */
export function purgeLocalWalletCache(userId?: string) {
  if (typeof window !== 'undefined') {
    const keysToPurge = [
      'ss-mnemonic',
      'ss-cached-wallets',
      'account_number',
      'ss-wallet-balances',
      'hidden_tokens',
      'custom_tokens',
      'active_network_id',
      'ss-infura-key',
      'ss-alchemy-key',
      'ss-profile-cache'
    ];

    keysToPurge.forEach(key => {
      if (userId) localStorage.removeItem(`${key}-${userId}`);
      localStorage.removeItem(key); 
    });

    sessionStorage.clear();
    registryDb.purgeAll();
    console.log("[PURGE_SENTINEL] Local registry nodes terminated.");
  }
}
