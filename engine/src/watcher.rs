use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::spawn_local;
use js_sys::Function;
use tokio_tungstenite::connect_async;
use futures_util::{StreamExt, SinkExt};
use serde_json::Value;

/// Starts a WebSocket listener that watches for events related to `user_address`.
///
/// * `ws_url` – Alchemy (or other) WebSocket endpoint.
/// * `user_address` – address to filter events for (checksum case‑sensitive).
/// * `on_event` – a JavaScript callback that receives the raw JSON event string.
///
/// The function runs forever (or until the page unloads). Errors are logged to the console.
#[wasm_bindgen]
pub fn start_watcher(ws_url: String, user_address: String, on_event: Function) {
    // Spawn the async task on the WASM executor.
    spawn_local(async move {
        // Connect to the WS endpoint.
        let url = ws_url.clone();
        let (ws_stream, _) = match connect_async(&url).await {
            Ok(res) => res,
            Err(e) => {
                web_sys::console::error_1(&format!("Watcher connect error: {:?}", e).into());
                return;
            }
        };
        let (mut write, mut read) = ws_stream.split();

        // Subscribe to pending and confirmed logs for the user address.
        // This is a minimal subscription that works with Alchemy's
        // `alchemy_subscribe` method. Adjust the JSON as needed for other providers.
        let sub_msg = json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "alchemy_subscribe",
            "params": [
                "alchemy_filteredNewFullPendingTransactions",
                {"address": user_address}
            ]
        });
        if let Err(e) = write.send(tokio_tungstenite::tungstenite::Message::Text(sub_msg.to_string())).await {
            web_sys::console::error_1(&format!("Watcher send error: {:?}", e).into());
            return;
        }

        // Listen for incoming messages.
        while let Some(msg) = read.next().await {
            match msg {
                Ok(tokio_tungstenite::tungstenite::Message::Text(txt)) => {
                    // Very naive filter – forward everything to the callback.
                    // In a real implementation you would parse `txt` as JSON
                    // and ensure `from` or `to` matches `user_address`.
                    let _ = on_event.call1(&JsValue::NULL, &JsValue::from_str(&txt));
                }
                Ok(_) => {}
                Err(e) => {
                    web_sys::console::error_1(&format!("Watcher read error: {:?}", e).into());
                    break;
                }
            }
        }
    });
}
