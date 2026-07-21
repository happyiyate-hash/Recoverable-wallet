/**
 * INSTITUTIONAL SECURITY CONFIG
 * Version: 1.0.0
 */

export const SECURITY_CONFIG = {
  encryption: {
    algorithm: 'aes-256-cbc',
    keyLength: 32,
    ivLength: 16,
  },
  sentinel: {
    maxTransactionValueUsd: 10000,
    dailyUserLimitUsd: 25000,
  }
};
