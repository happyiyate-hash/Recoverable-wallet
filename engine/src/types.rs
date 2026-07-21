// src/types.rs

use serde::{Serialize, Deserialize};

/// Configuration passed to the engine on init.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct Config {
    /// RPC URL for the chain (e.g., https://eth-mainnet.alchemyapi.io/v2/…)
    pub rpc_url: String,
    /// Optional Alchemy WebSocket URL for the watcher (if needed later)
    pub alchemy_ws: Option<String>,
    /// Optional API key for DEX price aggregation
    pub price_api_key: Option<String>,
}

/// Token information returned to the UI.
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct TokenData {
    /// Token contract address (zero address for native coin)
    pub address: String,
    /// Balance as a decimal string (raw integer from the chain)
    pub balance: String,
    /// Symbol, e.g. "ETH" or "USDC"
    pub symbol: String,
    /// Number of decimals used by the token
    pub decimals: u8,
    /// True for the native coin, false for ERC‑20 tokens
    pub is_native: bool,
}
