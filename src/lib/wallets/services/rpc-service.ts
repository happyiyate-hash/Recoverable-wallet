
'use client';

import evmNetworks from '@/lib/evmNetworks.json';
import { ChainConfig } from '@/lib/types';
import { getAlchemyRPC } from '../alchemy_rpc_endpoints';

/**
 * INSTITUTIONAL RPC REGISTRY
 * Version: 8.0.0 (Concise Name Handshake)
 */

export function getRPC(chainName: string, infuraKey: string | null = null, alchemyKey: string | null = null): string {
  const name = chainName.toLowerCase();

  // 1. FULL ALCHEMY GATEWAY REGISTRY (51 Nodes)
  const alchemyMap: Record<string, string> = {
    "worldchain": "worldchain",
    "shape": "shape",
    "starknet": "starknet",
    "arbitrum nova": "arbnova",
    "astar": "astar",
    "polygon zkevm": "polygonzkevm",
    "zetachain": "zetachain",
    "berachain": "berachain",
    "zora": "zora",
    "robinhood": "robinhood",
    "ronin": "ronin",
    "plasma": "plasma",
    "mythos": "mythos",
    "settlus": "settlus",
    "bob": "bob",
    "rootstock": "rootstock",
    "citrea": "citrea",
    "solana": "solana",
    "gensyn": "gensyn",
    "arc": "arc",
    "risa": "risa",
    "humanity": "humanity",
    "clankermon": "clankermon",
    "story": "story",
    "hyperliquid": "hyperliquid",
    "soneium": "soneium",
    "stable": "stable",
    "abstract": "abstract",
    "crossfi": "crossfi",
    "xmtp": "xmtp",
    "sonic": "sonic",
    "metis": "metis",
    "anime": "anime",
    "apechain": "apechain",
    "moonbeam": "moonbeam",
    "mode": "mode",
    "polynomial": "polynomial",
    "bitcoin": "bitcoin",
    "degen": "degen",
    "tron": "tron",
    "worldmobile": "worldmobile",
    "flow": "flow",
    "monad": "monad",
    "synd": "synd",
    "superseed": "superseed",
    "boba": "boba",
    "celestiabridge": "celestiabridge",
    "gnosis": "gnosis",
    "ink": "ink",
    "botanix": "botanix",
    "frax": "frax",
    // Unified concise mappings
    "ethereum": "ethereum",
    "polygon": "polygon",
    "arbitrum": "arbnova",
    "avalanche": "avalanche"
  };

  if (alchemyKey && alchemyMap[name]) {
    const alchemyUrl = getAlchemyRPC(alchemyMap[name] as any, alchemyKey);
    if (alchemyUrl) return alchemyUrl;
  }

  // 2. REGISTRY HANDSHAKE (evmNetworks.json)
  const allChains = Object.values(evmNetworks) as ChainConfig[];
  const chain = allChains.find(c => 
    c.name.toLowerCase() === name || 
    c.symbol.toLowerCase() === name ||
    c.type?.toLowerCase() === name
  );

  if (chain) {
    return chain.rpcUrl.replace('{API_KEY}', infuraKey || '');
  }

  // 3. PROTOCOL DEFAULTS (Fallbacks)
  const defaults: Record<string, string> = {
    solana: 'https://api.mainnet-beta.solana.com',
    bitcoin: 'https://blockstream.info/api',
    litecoin: 'https://litecoinblockexplorer.net/api',
    dogecoin: 'https://explorer.dogecoinev.com/api',
    'xrp': 'wss://xrplcluster.com',
    polkadot: 'wss://polkadot-rpc.publicnode.com',
    near: 'https://rpc.mainnet.near.org'
  };

  if (defaults[name]) return defaults[name];

  throw new Error(`RPC_NODE_NOT_FOUND: No verified endpoint for ${chainName}`);
}
