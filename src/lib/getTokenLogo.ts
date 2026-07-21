'use server';

import { logoSupabase } from './supabase/logo-server';
import { LOGO_CDN_URL } from './supabase/logo-client';
import { ethers } from 'ethers';

/**
 * INSTITUTIONAL TWO-TIER BRANDING ENGINE
 * Version: 40.0.0 (Persistent Handshake Standard)
 */

// OVERRIDE REGISTRY: Explicit branding nodes for colliding identifiers
const INSTITUTIONAL_BRANDING_MAPPING: Record<string, string> = {
  "Ethereum": "ETH",
  "Base": "BASE",
  "Linea": "LINEA",
  "Optimism": "OP",
  "Arbitrum": "ARB",
  "Blast": "BLAST",
  "ZKsync": "ZKSYNC",
  "Scroll": "SCROLL",
  "Hemi": "HEMI",
  "Swellchain": "SWELL",
  "Unichain": "UNI",
  "Polygon": "POL",
  "Zora": "ZORA",
  "Shape": "SHP",
  "Arbitrum Nova": "NOVA",
  "BOB": "BOB",
  "Mode": "MODE",
  "Ink": "INK",
  "Plasma": "PLASMA",
  "Boba": "BOBA",
  "Boba Network": "BOBA",
  "Worldmobile": "WORLDMOBILE",
  "Wevinacoin": "WNC",
  "BNB Beacon Chain": "BNB"
};

/**
 * Authoritative mapping from symbol/id to CDN Full-Name standard.
 * Ensures the wallet asks for the exact chain node (The FAST Way).
 */
export async function getCDNFullChainName(chainId: number, currentName: string): Promise<string> {
  const mapping: Record<number, string> = {
    1: "Ethereum",
    56: "BNB Smart Chain",
    137: "Polygon",
    42161: "Arbitrum One",
    10: "Optimism",
    8453: "Base",
    43114: "Avalanche C-Chain",
    59144: "Linea",
    534352: "Scroll",
    1329: "Sei Mainnet",
    0: "Bitcoin",
    501: "Solana",
    728126428: "TRON",
    397: "NEAR Protocol",
    1000: "Polkadot",
    714: "BNB Beacon Chain"
  };
  return mapping[chainId] || currentName;
}

/**
 * Institutional mapping for TrustWallet Assets Repository blockchains.
 */
const TRUST_WALLET_BLOCKCHAIN_MAP: Record<number, string> = {
  1: "ethereum",
  56: "smartchain",
  137: "polygon",
  42161: "arbitrum",
  10: "optimism",
  8453: "base",
  43114: "avalanchec",
  250: "fantom",
  25: "cronos",
  501: "solana",
  0: "bitcoin",
  714: "binance"
};

/**
 * Normalizes a blockchain name into a strict institutional search key.
 */
function normalizeName(name: string): string {
  if (!name) return 'UNKNOWN';
  
  let n = name.toUpperCase().trim();
  
  // Strip common suffixes that aren't part of the database search keys
  n = n.replace(' MAINNET', '');
  n = n.replace(' TESTNET', '');
  n = n.replace(' NETWORK', '');
  n = n.replace(' PROTOCOL', '');
  n = n.replace(' C-CHAIN', '');
  n = n.replace(' POS', '');
  n = n.replace(' ONE', '');
  n = n.replace(' ERA', '');
  n = n.replace(' ETHEREUM', ''); 
  
  // Remove all spaces for an atomic key
  return n.replace(/\s+/g, '');
}

/**
 * Fetches a logo URL using the tiered Name-Primary / Symbol-Fallback protocol.
 */
export async function getDirectLogoUrl(tokenName: string, symbol?: string, chainId?: number): Promise<string | null> {
  if (!logoSupabase) return null;

  // 🛡️ Differentiated BNB Fetching Protocol
  let fetchSymbol = symbol?.trim().toUpperCase();

  if (fetchSymbol === 'BNB') {
      if (chainId === 204) fetchSymbol = 'OPBNB';
      if (chainId === 714) fetchSymbol = 'BEP2';
  }

  // 1. TIER 1: INSTITUTIONAL MAPPING (By Name)
  if (tokenName && INSTITUTIONAL_BRANDING_MAPPING[tokenName]) {
    const forcedSymbol = INSTITUTIONAL_BRANDING_MAPPING[tokenName];
    try {
      const { data } = await logoSupabase
        .from('token_logos')
        .select('public_url')
        .ilike('symbol', forcedSymbol)
        .limit(1)
        .maybeSingle();
      
      if (data?.public_url) return getFullLogoUrl(data.public_url);
    } catch (e) {}
  }

  // 2. TIER 2: PRIMARY NAME SEARCH
  if (tokenName) {
    const searchKey = normalizeName(tokenName);
    try {
      const { data: symMatch } = await logoSupabase
        .from('token_logos')
        .select('public_url')
        .ilike('symbol', searchKey)
        .limit(1)
        .maybeSingle();

      if (symMatch?.public_url) return getFullLogoUrl(symMatch.public_url);

      const { data: nameMatch } = await logoSupabase
        .from('token_logos')
        .select('public_url')
        .ilike('name', tokenName.trim())
        .limit(1)
        .maybeSingle();

      if (nameMatch?.public_url) return getFullLogoUrl(nameMatch.public_url);
    } catch (e) {}
  }

  // 3. TIER 3: FALLBACK SYMBOL SEARCH
  if (fetchSymbol) {
    try {
      const { data: tickerMatch } = await logoSupabase
        .from('token_logos')
        .select('public_url')
        .ilike('symbol', fetchSymbol)
        .limit(1)
        .maybeSingle();

      if (tickerMatch?.public_url) return getFullLogoUrl(tickerMatch.public_url);
    } catch (e) {}
  }

  return null;
}

/**
 * UNIFIED LOGO DISCOVERY PROTOCOL
 */
export async function getTokenLogoUnified(chainId: number, address: string, name: string, symbol?: string): Promise<string | null> {
    // 1. TIER 1: INTERNAL CDN
    const cdnLogo = await getDirectLogoUrl(name, symbol, chainId);
    if (cdnLogo) return cdnLogo;

    // 2. TIER 2: TRUSTWALLET REPOSITORY
    const trustChain = TRUST_WALLET_BLOCKCHAIN_MAP[chainId];
    if (trustChain && address && address.startsWith('0x') && address.length === 42) {
        try {
            const checksumAddr = ethers.getAddress(address);
            return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/${trustChain}/assets/${checksumAddr}/logo.png`;
        } catch (e) {}
    }

    return null;
}

/**
 * Fetches all tokens for a given network directly from Supabase.
 */
export async function fetchNetworkTokens(networkName: string): Promise<any[]> {
  if (!logoSupabase || !networkName) return [];

  try {
    const { data, error } = await logoSupabase
      .from('token_metadata')
      .select('token_details, contract_address, network, logo_url')
      .eq('network', networkName.toLowerCase());

    if (error) {
      console.error(`[REGISTRY_FETCH_ERROR] for ${networkName}:`, error.message);
      return [];
    }

    if (!data) return [];

    return data.map(token => {
      const details = token.token_details || {};
      if (!details.symbol) return null;

      return {
        symbol: details.symbol,
        name: details.name || details.symbol,
        decimals: details.decimals || 18,
        network: token.network,
        contract: token.contract_address,
        logo_url: token.logo_url, 
        priceSource: details.priceSource || 'coingecko',
        priceId: details.priceId || details.coingeckoId,
      };
    }).filter(t => t !== null);
  } catch (e) {
    console.error("[REGISTRY_DISCOVERY_FAIL]", e);
    return [];
  }
}

/**
 * Fetches token prices directly from metadata for custom registry nodes.
 */
export async function fetchTokenPricesFromMetadata(contractAddresses: string[]): Promise<any[]> {
  if (!logoSupabase || contractAddresses.length === 0) return [];
  try {
    const { data } = await logoSupabase
      .from('token_metadata')
      .select('contract_address, token_details')
      .in('contract_address', contractAddresses.map(a => a.toLowerCase()));
    return data || [];
  } catch (e) {
    return [];
  }
}

/**
 * Prepares a full URL from a relative CDN path.
 */
export async function getFullLogoUrl(relativeUrl: string | null | undefined): Promise<string | null> {
    if (!relativeUrl || typeof relativeUrl !== 'string') return null;
    if (relativeUrl.startsWith('http')) return relativeUrl;
    
    const cleanPath = relativeUrl.startsWith('/') ? relativeUrl : '/' + relativeUrl;
    return `${LOGO_CDN_URL}${cleanPath}`;
}
