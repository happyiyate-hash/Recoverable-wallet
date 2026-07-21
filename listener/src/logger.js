require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const { sendNotification } = require("./notification");
const { formatLog } = require("./formatter");
const { decodeLog } = require("./decoder");

// Configuration
const RPC_URL = process.env.RPC_URL || "https://cloudflare-eth.com"; 
const USER_ADDRESS = process.env.USER_ADDRESS || "0x0000000000000000000000000000000000000000";
const USER_FCM_TOKEN = process.env.USER_FCM_TOKEN || "PASTE_USER_FCM_TOKEN_HERE";

// Initialize Provider
const provider = new ethers.JsonRpcProvider(RPC_URL);

// Memory cache
const sentTx = new Set();
const activities = []; // Store activities for the API

// Express Setup
const app = express();
app.use(cors());

app.get("/activities", (req, res) => {
  res.json(activities);
});

async function logActivity(type, data) {
  if (data.txHash) {
    if (sentTx.has(data.txHash)) return;
    sentTx.add(data.txHash);
    
    if (sentTx.size > 1000) {
      sentTx.delete(sentTx.values().next().value);
    }
  }

  if (type === "PENDING") return;

  const entry = {
    type,
    timestamp: new Date().toISOString(),
    ...data
  };

  const formattedMessage = formatLog(entry);
  console.log("\n📊", formattedMessage);
  
  // Store for the UI Panel
  activities.unshift(entry);
  if (activities.length > 50) activities.pop(); // Keep last 50

  await sendNotification(USER_FCM_TOKEN, "Wallet Activity", formattedMessage);
}

async function startListener() {
  console.log(`📡 Starting Blockchain Listener on ${RPC_URL}`);
  console.log(`👀 Monitoring address: ${USER_ADDRESS}`);

  provider.on("block", async (blockNumber) => {
    try {
      const block = await provider.getBlock(blockNumber, true);
      if (!block || !block.prefetchedTransactions) return;

      for (const tx of block.prefetchedTransactions) {
        if (tx.from?.toLowerCase() === USER_ADDRESS.toLowerCase() || tx.to?.toLowerCase() === USER_ADDRESS.toLowerCase()) {
          const receipt = await provider.getTransactionReceipt(tx.hash);
          if (receipt && receipt.logs) {
            for (const log of receipt.logs) {
              await decodeLog(log, provider, USER_ADDRESS, logActivity);
            }
          }
        }
      }
    } catch (error) {}
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Activity API running on http://localhost:${PORT}`);
  });
}

startListener().catch(console.error);

module.exports = { provider, logActivity };
