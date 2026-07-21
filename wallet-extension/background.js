
/**
 * NODE QUICK BACKGROUND CONTROLLER
 * Version: 4.0.0 (Central Signing Engine)
 * Orchestrates institutional state and handles secure registry requests.
 */

let currentChainId = "0x1"; 
let activeAccount = null;
let pendingRequests = {};

/**
 * Broadcasts a state change event to all active dApp tabs.
 */
function broadcastEvent(eventName, data) {
  chrome.tabs.query({}, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: "NODE_QUICK_EVENT",
        name: eventName,
        data: data
      }).catch(() => {});
    });
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // RPC REQUEST HANDLING (From Content Script)
  if (request.type === "NODE_QUICK_RPC_REQUEST") {
    const { requestId, method, params } = request;
    
    pendingRequests[requestId] = {
      requestId,
      method,
      params,
      origin: sender.tab?.url || "Unknown"
    };

    // TRIGGER POPUP FOR SENSITIVE HANDSHAKES
    if (["eth_requestAccounts", "eth_sendTransaction", "personal_sign", "eth_signTypedData"].includes(method)) {
      // Store as the active request for the popup UI
      chrome.storage.local.set({ activeRequest: pendingRequests[requestId] }, () => {
        // Open the institutional approval window
        chrome.windows.create({
          url: 'popup.html',
          type: 'popup',
          width: 360,
          height: 500
        });
      });
    } else if (method === "eth_chainId") {
      // Immediate response for non-sensitive data
      chrome.tabs.sendMessage(sender.tab.id, {
        type: "NODE_QUICK_RPC_RESPONSE",
        requestId,
        result: currentChainId
      });
    } else if (method === "eth_accounts") {
      chrome.tabs.sendMessage(sender.tab.id, {
        type: "NODE_QUICK_RPC_RESPONSE",
        requestId,
        result: activeAccount ? [activeAccount] : []
      });
    }
  }

  // RESOLUTION HANDLING (From Popup Approval UI)
  if (request.type === "NODE_QUICK_RESOLVE_REQUEST") {
    const { requestId, result, error } = request;
    const originalRequest = pendingRequests[requestId];

    if (originalRequest) {
      // Update local state if accounts were granted
      if (originalRequest.method === 'eth_requestAccounts' && !error) {
        activeAccount = result[0];
        broadcastEvent('accountsChanged', result);
      }

      // Forward resolution back to the specific tab
      chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, {
            type: "NODE_QUICK_RPC_RESPONSE",
            requestId,
            result,
            error
          }).catch(() => {});
        });
      });

      delete pendingRequests[requestId];
      chrome.storage.local.remove("activeRequest");
    }
  }
  
  return true; // Keep channel open for async handshakes
});
