const { ethers } = require("ethers");

const ERC20_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

// Simple in-memory cache to prevent repeated RPC calls for the same token
const cache = {};

async function getTokenInfo(provider, tokenAddress) {
  if (cache[tokenAddress]) return cache[tokenAddress];

  try {
    const contract = new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    );

    // Fetch symbol and decimals concurrently
    const [symbol, decimals] = await Promise.all([
      contract.symbol(),
      contract.decimals()
    ]);

    const info = { symbol, decimals };
    cache[tokenAddress] = info;

    return info;
  } catch (err) {
    // Fallback if the contract is not ERC20 or fails
    return { symbol: "UNKNOWN", decimals: 18 };
  }
}

module.exports = { getTokenInfo };
