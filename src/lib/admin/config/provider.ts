/**
 * INSTITUTIONAL PROVIDER CONFIG
 * Version: 1.0.0
 * Settings for Ramp, Paychant, and external liquidity nodes.
 */

export const PROVIDER_CONFIG = {
  ramp: {
    baseUrl: "https://api.ramp.network",
    apiKey: process.env.RAMP_API_KEY || "",
  },
  paychant: {
    baseUrl: "https://api.paychant.com",
    apiKey: process.env.PAYCHANT_API_KEY || "",
  },
  liquidity: {
    minBufferPercent: 5, // 5% liquidity buffer for internal swaps
  }
};
