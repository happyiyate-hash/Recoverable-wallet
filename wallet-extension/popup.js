
/**
 * NODE QUICK POPUP CONTROLLER
 * Version: 4.0.0 (Handshake Engine)
 * Manages the approval UI and communicates with the Central signing engine.
 */
document.addEventListener('DOMContentLoaded', async () => {
  const addressDisplay = document.getElementById("address");
  const defaultView = document.getElementById("default-view");
  const approvalView = document.getElementById("approval-view");
  
  const originLabel = document.getElementById("request-origin");
  const messageLabel = document.getElementById("request-message");
  
  const approveBtn = document.getElementById("approve");
  const rejectBtn = document.getElementById("reject");

  // IDENTIY NODE RESOLUTION
  // In production, this address is retrieved from chrome.storage.local (synced from the app)
  let myAddress = "0x835729104AC6729384729104837529104837";
  addressDisplay.innerText = `${myAddress.slice(0, 10)}...${myAddress.slice(-8)}`;

  // 1. CHECK FOR ACTIVE REQUESTS
  chrome.storage.local.get(["activeRequest"], (result) => {
    if (result.activeRequest) {
      const { requestId, method, origin, params } = result.activeRequest;
      
      // Toggle to Approval Mode
      defaultView.style.display = "none";
      approvalView.style.display = "block";
      
      try {
        originLabel.innerText = new URL(origin).hostname;
      } catch (e) {
        originLabel.innerText = origin;
      }
      
      // Method-specific messaging
      if (method === "eth_requestAccounts") {
        messageLabel.innerText = "Authorize connection to your identity node.";
        approveBtn.innerText = "Connect";
      } else if (method === "eth_sendTransaction") {
        messageLabel.innerText = "Authorize a new transfer request.";
        approveBtn.innerText = "Sign & Send";
      } else if (method === "personal_sign") {
        messageLabel.innerText = "Authorize a secure message signature.";
        approveBtn.innerText = "Sign Message";
      } else {
        messageLabel.innerText = `Protocol Request: ${method}`;
        approveBtn.innerText = "Authorize";
      }

      // 2. APPROVAL DISPATCH
      approveBtn.onclick = () => {
        chrome.runtime.sendMessage({
          type: "NODE_QUICK_RESOLVE_REQUEST",
          requestId,
          result: (method === "eth_requestAccounts" || method === "eth_accounts") ? [myAddress] : "0x_mock_tx_hash"
        });
        window.close();
      };

      // 3. REJECTION DISPATCH
      rejectBtn.onclick = () => {
        chrome.runtime.sendMessage({
          type: "NODE_QUICK_RESOLVE_REQUEST",
          requestId,
          error: "User rejected the handshake request."
        });
        window.close();
      };
    }
  });
});
