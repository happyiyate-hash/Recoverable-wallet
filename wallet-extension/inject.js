
/**
 * NODE QUICK PROVIDER INJECTION
 * Version: 4.0.0 (EIP-1193 Unified Standard)
 * Injects a fully compliant window.ethereum provider for institutional dApp interoperability.
 */
(function () {
  const listeners = {};

  const provider = {
    isNodeQuick: true,
    isMetaMask: false, // Explicitly identified as Node Quick
    chainId: "0x1", // Default to Ethereum Mainnet
    selectedAddress: null,

    /**
     * Main RPC Interface (EIP-1193)
     */
    request: async ({ method, params }) => {
      const requestId = Math.random().toString(36).substring(7);
      console.log(`[NODE_QUICK_PROXY] Dispatching: ${method}`, params);

      return new Promise((resolve, reject) => {
        // Relay RPC payload to content script
        window.postMessage({
          type: "NODE_QUICK_RPC_REQUEST",
          requestId,
          method,
          params
        }, "*");

        // Handle incoming response registry
        const handleResponse = (event) => {
          if (event.data.type === "NODE_QUICK_RPC_RESPONSE" && event.data.requestId === requestId) {
            window.removeEventListener("message", handleResponse);
            
            if (event.data.error) {
              reject(new Error(event.data.error));
            } else {
              resolve(event.data.result);
            }
          }
        };
        window.addEventListener("message", handleResponse);
      });
    },

    /**
     * Event Subscription Node
     */
    on: (event, callback) => {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(callback);
    },

    removeListener: (event, callback) => {
      if (!listeners[event]) return;
      listeners[event] = listeners[event].filter(cb => cb !== callback);
    },

    /**
     * Internal Event Dispatcher
     */
    emit: (event, data) => {
      if (!listeners[event]) return;
      listeners[event].forEach(cb => cb(data));
    }
  };

  /**
   * Listen for state updates from the Controller (Background)
   */
  window.addEventListener("message", (event) => {
    if (event.data.type === "NODE_QUICK_EVENT") {
      const { name, data } = event.data;
      
      // Update local provider properties for synchronous access
      if (name === 'accountsChanged') provider.selectedAddress = data[0] || null;
      if (name === 'chainChanged') provider.chainId = data;
      
      // Notify dApp listeners
      provider.emit(name, data);
    }
  });

  // Export to window object
  window.ethereum = provider;
  
  // Announcement handshake
  window.dispatchEvent(new CustomEvent('ethereum#initialized'));
  console.log("[NODE_QUICK_EXTENSION] EIP-1193 Provider Node Injected.");
})();
