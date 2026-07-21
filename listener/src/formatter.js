function formatLog(log) {
  switch (log.type) {
    case "TRANSFER":
      // Example: "RECEIVED 50 USDT" or "SENT 1.0 ETH"
      return `${log.direction} ${log.amount} ${log.token}`;

    case "SWAP":
      if (log.message) {
        return log.message;
      }
      return `Swap executed`;

    case "APPROVAL":
      return `Token approved`;

    default:
      return log.type;
  }
}

module.exports = { formatLog };
