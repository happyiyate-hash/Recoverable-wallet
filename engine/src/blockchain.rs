use ethers::prelude::*;
use ethers::abi::Abi;
use serde::{Serialize, Deserialize};
use std::sync::Arc;

use crate::types::TokenData;

pub async fn fetch_balances_and_prices(
    rpc_url: String, 
    user_addr_str: String,
    tokens: Vec<String>
) -> Result<Vec<TokenData>, String> {
    let provider = Provider::<Http>::try_from(rpc_url).map_err(|e| e.to_string())?;
    let client = Arc::new(provider);
    let user_addr: Address = user_addr_str.parse().map_err(|e| e.to_string())?;

    // 0xcA11b... is the standard Multicall3 address on almost all EVM chains
    let multicall_addr: Address = "0xcA11bde05977b3631167028862bE2a173976CA11".parse().unwrap();
    let mut multicall = Multicall::new(client.clone(), Some(multicall_addr)).await.map_err(|e| e.to_string())?;

    // 1. Add Call: Native Balance (ETH/BNB)
    multicall.add_get_eth_balance(user_addr, false);

    // 2. Add Calls: ERC-20 Balances & Symbols
    // Simple Human-Readable ABI for the Multicall
    let erc20_abi: Abi = serde_json::from_str(r#"[
        {"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"},
        {"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"type":"function"},
        {"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"type":"function"}
    ]"#).unwrap();

    for token_str in &tokens {
        let token_addr: Address = token_str.parse().map_err(|e| e.to_string())?;
        let contract = Contract::new(token_addr, erc20_abi.clone(), client.clone());
        
        multicall.add_call(contract.method::<_, U256>("balanceOf", user_addr).unwrap(), false);
        multicall.add_call(contract.method::<_, String>("symbol", ()).unwrap(), false);
        multicall.add_call(contract.method::<_, u8>("decimals", ()).unwrap(), false);
    }

    // 3. Execute the "Big Bang" call
    // This sends ONE request to the blockchain for EVERYTHING
    let results = multicall.aggregate().await.map_err(|e| e.to_string())?;
    
    // 4. Parse the results back into our TokenData struct
    let mut final_data = Vec::new();
    
    // Handle Native Balance (first result)
    let native_bal: U256 = results.0;
    final_data.push(TokenData {
        address: "0x0000000000000000000000000000000000000000".to_string(),
        balance: native_bal.to_string(),
        symbol: "ETH".to_string(), // adjust per chain later
        decimals: 18,
        is_native: true,
    });

    // The results vector contains the ERC-20 calls in order:
    // [balance0, symbol0, decimals0, balance1, symbol1, decimals1, ...]
    let mut idx = 0usize;
    while idx + 2 < results.1.len() {
        let balance: U256 = results.1[idx];
        let symbol: String = results.1[idx + 1].clone();
        let decimals: u8 = results.1[idx + 2];
        let token_addr = tokens[idx / 3].clone();
        final_data.push(TokenData {
            address: token_addr,
            balance: balance.to_string(),
            symbol,
            decimals,
            is_native: false,
        });
        idx += 3;
    }

    Ok(final_data)
}
