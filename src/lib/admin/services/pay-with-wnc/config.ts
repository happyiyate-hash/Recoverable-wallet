
/**
 * PAY WITH WNC: ADMIN CONFIGURATION
 * Version: 1.0.0
 * 
 * Central registry for admin vault metadata and supported tokens.
 */

export const adminConfig = {
    // Master Admin Wallet (EVM)
    adminWallet: process.env.ADMIN_VAULT_ADDRESS || '0x7f3f4206017C0aACF7A94C9eF7B80563984aD288',
    
    // Server-side Secret (Never exposed to client)
    privateKey: process.env.ADMIN_SECRET_PHRASE || "chelsea ship purity expose enact sugar present merit weather case wet match welcome",
    
    // Institutional Constants
    gasFeeUsd: 0.05,
    minLiquidityBuffer: 1.1, // 10% buffer
    
    // Supported Registry Tokens
    supportedTokens: ["USDT", "USDC", "ETH", "BTC", "POL", "SOL", "XRP"]
};
