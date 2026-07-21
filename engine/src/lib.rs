use wasm_bindgen::prelude::*;
mod blockchain;

#[wasm_bindgen]
pub async fn get_full_portfolio(
    rpc_url: String,
    user_address: String,
    tokens: JsValue // Array of strings
) -> Result<JsValue, JsValue> {
    // Convert JsValue tokens to a Rust Vector
    let token_addresses: Vec<String> = serde_wasm_bindgen::from_value(tokens)
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    // Call the high‑speed blockchain logic
    let data = blockchain::fetch_balances_and_prices(rpc_url, user_address, token_addresses)
        .await
        .map_err(|e| JsValue::from_str(&e.to_string()))?;

    // Return as a clean JSON object to TS
    Ok(serde_wasm_bindgen::to_value(&data).unwrap())
}
