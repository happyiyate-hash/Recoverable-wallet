'use client';

/**
 * BLOCKCHAIN ERROR TRANSLATOR
 * Version: 1.0.0
 * 
 * Professional error message translator for Ethers.js v6
 * Converts technical blockchain errors into plain-English, user-friendly messages
 * 
 * Purpose: Prevent user panic by explaining exactly what happened in their language,
 * not in developer jargon. Every error is an opportunity to guide the user to recovery.
 */

export interface TranslatedError {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'error';
  action?: string; // Suggested action (e.g., "Increase slippage", "Check balance")
}

/**
 * Main error translator
 * Converts Ethers.js errors into user-friendly messages
 */
export function translateBlockchainError(error: any): TranslatedError {
  const code = error?.code;
  const message = (error?.message || "").toLowerCase();
  const shortMessage = (error?.shortMessage || "").toLowerCase();
  const reason = (error?.reason || "").toLowerCase();

  // =========================================================
  // 🔴 USER & BALANCE ERRORS
  // =========================================================
  if (code === "ACTION_REJECTED" || message.includes("user rejected")) {
    return {
      title: "Transaction Cancelled",
      message: "You declined the request in your wallet. No funds were sent.",
      severity: "info",
      action: "Try again when ready"
    };
  }

  if (code === "INSUFFICIENT_FUNDS" || message.includes("insufficient funds")) {
    return {
      title: "Insufficient Balance",
      message: "You don't have enough native tokens (MATIC, ETH, etc.) to cover the transaction and gas fees.",
      severity: "error",
      action: "Add funds to your wallet and try again"
    };
  }

  if (code === "INVALID_ARGUMENT" || message.includes("invalid argument")) {
    return {
      title: "Invalid Input",
      message: "The address, token amount, or other input is incorrect. Please check for typos and try again.",
      severity: "error",
      action: "Double-check your inputs"
    };
  }

  if (code === "UNSUPPORTED_OPERATION" || message.includes("unsupported")) {
    return {
      title: "Operation Not Supported",
      message: "This action isn't supported on the current network. Please switch to the correct blockchain.",
      severity: "warning",
      action: "Switch networks in your wallet settings"
    };
  }

  // =========================================================
  // 🟡 NETWORK & INFRASTRUCTURE ERRORS
  // =========================================================
  if (code === "SERVER_ERROR" || message.includes("server error")) {
    // Check for rate limiting (429)
    if (message.includes("429") || message.includes("too many requests") || message.includes("rate limit")) {
      return {
        title: "Network Congestion",
        message: "Blockchain nodes are at capacity. Please wait 30 seconds and try again.",
        severity: "warning",
        action: "Wait a moment and retry"
      };
    }

    // Check for gas station issues (common on Polygon)
    if (message.includes("gasstation") || message.includes("gas price")) {
      return {
        title: "Gas Price Service Unavailable",
        message: "The network's gas price service is temporarily unavailable. Your transaction will still work with default gas settings.",
        severity: "info",
        action: "Try again in a moment"
      };
    }

    return {
      title: "Network Error",
      message: "The blockchain server encountered an error. This is usually temporary.",
      severity: "error",
      action: "Please try again shortly"
    };
  }

  if (code === "TIMEOUT" || message.includes("timeout")) {
    return {
      title: "Connection Timeout",
      message: "The network is taking too long to respond. Check your internet and try again.",
      severity: "warning",
      action: "Check internet and retry"
    };
  }

  if (code === "NETWORK_ERROR" || message.includes("network error") || message.includes("unable to connect")) {
    return {
      title: "Network Connection Failed",
      message: "Unable to connect to the blockchain. The network might be temporarily down or your internet is offline.",
      severity: "error",
      action: "Check your internet connection"
    };
  }

  if (code === "NONCE_EXPIRED" || message.includes("nonce")) {
    return {
      title: "Transaction Sequence Error",
      message: "Your transaction sequence got out of sync. Restart the app to resync your wallet state.",
      severity: "warning",
      action: "Refresh the page or restart the app"
    };
  }

  // =========================================================
  // 🔴 SMART CONTRACT ERRORS
  // =========================================================
  if (code === "UNPREDICTABLE_GAS_LIMIT" || message.includes("unpredictable gas")) {
    return {
      title: "Transaction Will Likely Fail",
      message: "We cannot estimate gas for this transaction. It will probably fail due to contract logic, insufficient allowance, or balance issues.",
      severity: "error",
      action: "Check your balance, token allowance, or contract inputs"
    };
  }

  // Execution reverted (general smart contract failure)
  if (code === "CALL_EXCEPTION" || message.includes("execution reverted")) {
    // Check for slippage (most common swap failure)
    if (message.includes("slippage") || reason.includes("slippage")) {
      return {
        title: "Swap Price Moved Too Fast",
        message: "The token price changed faster than your slippage tolerance allows. Your swap was cancelled to protect you from losing funds.",
        severity: "warning",
        action: "Increase slippage tolerance in settings and try again"
      };
    }

    // Check for allowance issues
    if (message.includes("allowance") || reason.includes("allowance")) {
      return {
        title: "Token Allowance Missing",
        message: "This contract doesn't have permission to transfer your tokens. You need to approve it first.",
        severity: "error",
        action: "Approve the token transfer in the next step"
      };
    }

    // Generic revert
    return {
      title: "Transaction Rejected by Smart Contract",
      message: "The blockchain rejected this transaction. This usually means the contract logic failed or your inputs are invalid.",
      severity: "error",
      action: "Review your transaction details or try again"
    };
  }

  if (code === "TRANSACTION_REVERTED" || message.includes("transaction reverted")) {
    // Slippage is the most common reason for swap reversions
    if (message.includes("slippage") || reason.includes("slippage")) {
      return {
        title: "Price Slippage Too High",
        message: "The token price moved faster than your slippage setting allows. To complete swaps in volatile markets, increase your slippage tolerance.",
        severity: "warning",
        action: "Increase slippage tolerance (Settings > Swap) and retry"
      };
    }

    return {
      title: "Transaction Failed",
      message: "The transaction failed on the blockchain. This could be due to high slippage, insufficient liquidity, or contract errors.",
      severity: "error",
      action: "Check slippage settings and try again"
    };
  }

  // =========================================================
  // 🟠 APPROVAL & SIGNATURE ERRORS
  // =========================================================
  if (message.includes("approval") || message.includes("approve")) {
    return {
      title: "Approval Failed",
      message: "Could not approve token transfer. Ensure you have sufficient balance and try again.",
      severity: "error",
      action: "Try approval again"
    };
  }

  if (message.includes("signature") || code === "SIGNING_ERROR") {
    return {
      title: "Signature Failed",
      message: "We couldn't sign your transaction. Make sure your wallet is unlocked and try again.",
      severity: "error",
      action: "Unlock your wallet and retry"
    };
  }

  // =========================================================
  // 🟠 GAS ESTIMATION ERRORS
  // =========================================================
  if (message.includes("out of gas") || message.includes("insufficient gas")) {
    return {
      title: "Insufficient Gas",
      message: "The transaction requires more gas than available. Your balance is too low for this operation.",
      severity: "error",
      action: "Add funds to cover gas fees"
    };
  }

  // =========================================================
  // 🎯 FALLBACK FOR UNKNOWN ERRORS
  // =========================================================
  return {
    title: "Transaction Failed",
    message: error?.message || "An unexpected blockchain error occurred. Please try again.",
    severity: "error",
    action: "Contact support if the problem persists"
  };
}

/**
 * Extract just the message string (for Toast notifications)
 */
export function getErrorMessage(error: any): string {
  return translateBlockchainError(error).message;
}

/**
 * Extract action suggestion
 */
export function getErrorAction(error: any): string | undefined {
  return translateBlockchainError(error).action;
}

/**
 * Check if error is user-recoverable
 */
export function isRecoverableError(error: any): boolean {
  const { severity, action } = translateBlockchainError(error);
  return severity !== 'error' || !!action;
}

/**
 * Format error for logging (for debugging)
 */
export function logBlockchainError(error: any, context?: string): void {
  const translated = translateBlockchainError(error);
  console.error(`[BLOCKCHAIN_ERROR]${context ? ` (${context})` : ''}:`, {
    title: translated.title,
    message: translated.message,
    severity: translated.severity,
    action: translated.action,
    originalCode: error?.code,
    originalMessage: error?.message,
    originalError: error
  });
}
