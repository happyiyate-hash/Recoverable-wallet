/**
 * ALCHEMY MULTI-CHAIN RPC REGISTRY
 * Version: 4.0.0 (Full 51-Chain Handshake)
 * 
 * This file contains all the Alchemy RPC endpoints for your wallet.
 * Replace {{USER_API_KEY}} with the user-provided API key at runtime.
 */

const AlchemyRPC = {
  worldchain: "https://worldchain-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  shape: "https://shape-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  starknet: "https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_10/{{USER_API_KEY}}",
  arbnova: "https://arbnova-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  astar: "https://astar-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  polygonzkevm: "https://polygonzkevm-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  zetachain: "https://zetachain-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  berachain: "https://berachain-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  zora: "https://zora-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  robinhood: "https://robinhood-testnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  ronin: "https://ronin-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  plasma: "https://plasma-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  mythos: "https://mythos-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  settlus: "https://settlus-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  bob: "https://bob-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  rootstock: "https://rootstock-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  citrea: "https://citrea-testnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  solana: "https://solana-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  gensyn: "https://gensyn-testnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  arc: "https://arc-testnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  risa: "https://risa-testnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  humanity: "https://humanity-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  clankermon: "https://clankermon-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  story: "https://story-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  hyperliquid: "https://hyperliquid-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  soneium: "https://soneium-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  stable: "https://stable-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  abstract: "https://abstract-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  crossfi: "https://crossfi-testnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  xmtp: "https://xmtp-ropsten.g.alchemy.com/v2/{{USER_API_KEY}}",
  sonic: "https://sonic-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  metis: "https://metis-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  anime: "https://anime-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  apechain: "https://apechain-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  moonbeam: "https://moonbeam-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  mode: "https://mode-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  polynomial: "https://polynomial-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  bitcoin: "https://bitcoin-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  degen: "https://degen-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  tron: "https://tron-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  worldmobile: "https://worldmobile-testnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  flow: "https://flow-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  monad: "https://monad-testnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  synd: "https://synd-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  superseed: "https://superseed-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  boba: "https://boba-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  celestiabridge: "https://celestiabridge-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  gnosis: "https://gnosis-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  ink: "https://ink-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  botanix: "https://botanix-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}",
  frax: "https://frax-mainnet.g.alchemy.com/v2/{{USER_API_KEY}}"
};

/**
 * Resolves a specific Alchemy RPC URL by injecting the user's key.
 */
export function getAlchemyRPC(chainKey: keyof typeof AlchemyRPC, userKey: string | null): string | null {
  if (!userKey) return null;
  const baseUrl = AlchemyRPC[chainKey];
  if (!baseUrl) return null;
  return baseUrl.replace("{{USER_API_KEY}}", userKey);
}

export default AlchemyRPC;
