const { ethers } = require("ethers");
const { getTokenInfo } = require("./tokenResolver");

// Standard ERC20 and Router ABIs for parsing
const ERC20_TRANSFER_ABI = ["event Transfer(address indexed from, address indexed to, uint256 value)"];
const SWAP_ABI = ["event Swap(address indexed sender, uint amount0In, uint amount1In, uint amount0Out, uint amount1Out, address indexed to)"];

const transferInterface = new ethers.Interface(ERC20_TRANSFER_ABI);
const swapInterface = new ethers.Interface(SWAP_ABI);

const TRANSFER_TOPIC = transferInterface.getEvent("Transfer").topicHash;
const SWAP_TOPIC = swapInterface.getEvent("Swap").topicHash;

async function decodeLog(log, provider, userAddress, logActivity) {
  const normalizedUserAddress = userAddress.toLowerCase();

  try {
    // 1. Decode TRANSFER events
    if (log.topics[0] === TRANSFER_TOPIC && log.topics.length >= 3) {
      const parsed = transferInterface.parseLog(log);
      if (!parsed) return;

      const from = parsed.args.from.toLowerCase();
      const to = parsed.args.to.toLowerCase();
      const tokenAddress = log.address;

      if (from === normalizedUserAddress || to === normalizedUserAddress) {
        const token = await getTokenInfo(provider, tokenAddress);
        const amount = ethers.formatUnits(parsed.args.value, token.decimals);
        const direction = to === normalizedUserAddress ? "RECEIVED" : "SENT";

        await logActivity("TRANSFER", {
          direction,
          token: token.symbol,
          amount,
          from,
          to,
          txHash: log.transactionHash
        });
      }
    }

    // 2. Decode SWAP events
    else if (log.topics[0] === SWAP_TOPIC) {
      const parsed = swapInterface.parseLog(log);
      if (!parsed) return;

      // Uniswap V2/V3 Swap events usually have sender and to
      const sender = parsed.args.sender.toLowerCase();
      const to = parsed.args.to.toLowerCase();

      if (sender === normalizedUserAddress || to === normalizedUserAddress) {
        await logActivity("SWAP", {
          message: "Token swap detected",
          contract: log.address,
          txHash: log.transactionHash
        });
      }
    }
  } catch (error) {
    // Silently ignore parsing errors for logs that don't match our exact interfaces
    // console.error("Error decoding log:", error.message);
  }
}

module.exports = { decodeLog };
