/**
 * INSTITUTIONAL ADMIN BLOCKCHAIN CONFIG
 * Version: 1.1.0
 * Centralized registry for admin vault nodes and RPC endpoints.
 */

export const ADMIN_VAULT = {
  // Master Admin Address (EVM) - Optimized for high-liquidity settlements
  evm: process.env.ADMIN_VAULT_ADDRESS || '0x7f3f4206017C0aACF7A94C9eF7B80563984aD288',
  // Master Admin Address (Solana)
  solana: "BUNZrkGLBM13BaFEovCsmbS12hPEjVpxCCLWwiy2dKXd",
  // Master Admin Address (XRP)
  xrp: "rpgFikx5ncjZ73C5Z4aRvnL6PAKGsiowVB",
};

export const RPC_NODES: Record<number | string, string> = {
  1: "https://mainnet.infura.io/v3/{API_KEY}",
  137: "https://polygon-mainnet.infura.io/v3/{API_KEY}",
  501: "https://api.mainnet-beta.solana.com",
  "xrp": "wss://xrplcluster.com"
};
