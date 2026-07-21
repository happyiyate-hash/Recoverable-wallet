'use client';

import type { AssetRow, ChainConfig, WalletWithMetadata } from '@/lib/types';
import { getInitialAssets } from '@/lib/wallets/balances';

/**
 * INSTITUTIONAL BALANCE SERVICE
 * Version: 6.1.0 (Bitcoin Cash Handshake Integrated)
 */
export async function fetchBalancesForChain(
  chain: ChainConfig,
  wallets: WalletWithMetadata[],
  infuraApiKey: string | null,
  alchemyApiKey: string | null,
  userAddedTokens: AssetRow[]
): Promise<AssetRow[]> {
  const walletForChain = wallets.find(w => w.type === (chain.type || 'evm'));
  
  // 1. Prepare registry skeleton nodes
  const base = getInitialAssets(chain.chainId).map(a => ({ ...a, balance: '0' } as AssetRow));
  const custom = userAddedTokens.filter(t => t.chainId === chain.chainId);
  
  const combinedAssetsList = [...base, ...custom].reduce((acc, curr) => {
    const identifier = curr.isNative ? curr.symbol : curr.address?.toLowerCase();
    if (!acc.find(a => (a.isNative ? a.symbol : a.address?.toLowerCase()) === identifier)) {
      acc.push(curr);
    }
    return acc;
  }, [] as AssetRow[]);

  if (!walletForChain) return combinedAssetsList;

  try {
    // 2. Load Institutional Adapters
    const { evmAdapterFactory } = await import('@/lib/wallets/adapters/evm');
    const { xrpAdapterFactory } = await import('@/lib/wallets/adapters/xrp');
    const { polkadotAdapterFactory } = await import('@/lib/wallets/adapters/polkadot');
    const { kusamaAdapterFactory } = await import('@/lib/wallets/adapters/kusama');
    const { nearAdapterFactory } = await import('@/lib/wallets/adapters/near');
    const { solanaAdapterFactory } = await import('@/lib/wallets/adapters/solana');
    const { bitcoinAdapterFactory } = await import('@/lib/wallets/adapters/bitcoin');
    const { litecoinAdapterFactory } = await import('@/lib/wallets/adapters/litecoin');
    const { dogecoinAdapterFactory } = await import('@/lib/wallets/adapters/dogecoin');
    const { aptosAdapterFactory } = await import('@/lib/wallets/adapters/aptos');
    const { suiAdapterFactory } = await import('@/lib/wallets/adapters/sui');
    const { bep2AdapterFactory } = await import('@/lib/wallets/adapters/bep2');
    const { bitcoinCashAdapterFactory } = await import('@/lib/wallets/adapters/bitcoin-cash');

    let adapter = null;
    
    // Protocol Routing Handshake
    if (chain.type === 'xrp') adapter = xrpAdapterFactory(chain);
    else if (chain.type === 'polkadot') adapter = polkadotAdapterFactory(chain);
    else if (chain.type === 'kusama') adapter = kusamaAdapterFactory(chain);
    else if (chain.type === 'near') adapter = nearAdapterFactory(chain);
    else if (chain.type === 'solana') adapter = solanaAdapterFactory(chain);
    else if (chain.type === 'btc') adapter = bitcoinAdapterFactory(chain);
    else if (chain.type === 'ltc') adapter = litecoinAdapterFactory(chain);
    else if (chain.type === 'doge') adapter = dogecoinAdapterFactory(chain);
    else if (chain.type === 'aptos') adapter = aptosAdapterFactory(chain);
    else if (chain.type === 'sui') adapter = suiAdapterFactory(chain);
    else if (chain.type === 'bep2') adapter = bep2AdapterFactory(chain);
    else if (chain.type === 'bitcoin-cash') adapter = bitcoinCashAdapterFactory(chain);
    else adapter = evmAdapterFactory(chain, infuraApiKey, alchemyApiKey);

    if (adapter) {
      // 3. ATOMIC TIMEOUT: 15s limit for on-chain resolution
      const results = await Promise.race([
        adapter.fetchBalances(walletForChain.address, combinedAssetsList),
        new Promise<AssetRow[]>((_, reject) => 
          setTimeout(() => reject(new Error('RPC_TIMEOUT')), 15000)
        )
      ]);
      
      return results.map(r => ({ ...r, updatedAt: Date.now() }));
    }
  } catch (e: any) {
    console.warn(`[REGISTRY_NODE_DEFERRED] ${chain.name}: ${e.message}`);
  }
  
  return combinedAssetsList;
}
