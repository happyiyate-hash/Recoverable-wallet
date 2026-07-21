
/**
 * NODE QUICK CONTENT SENTINEL
 * Relays RPC requests and State Events between the dApp Proxy and the Central Controller.
 */

// 1. Inject the provider script into the DOM immediately
const script = document.createElement("script");
script.src = chrome.runtime.getURL("inject.js");
script.onload = function () {
  this.remove();
};
(document.head || document.documentElement).appendChild(script);

// 2. Listen for messages from the Proxy (The Website)
window.addEventListener("message", (event) => {
  if (event.source !== window) return;

  if (event.data.type === "NODE_QUICK_RPC_REQUEST") {
    // Forward the RPC payload to the background script for processing
    chrome.runtime.sendMessage(event.data);
  }
});

// 3. Listen for signals from the Background Controller (Responses & Events)
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "NODE_QUICK_RPC_RESPONSE" || message.type === "NODE_QUICK_EVENT") {
    // Relay the message to the injected provider script via window.postMessage
    window.postMessage(message, "*");
  }
});
