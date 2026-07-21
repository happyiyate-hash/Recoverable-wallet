
/**
 * JUPITER EXECUTION NODE
 * Version: 6.0.0 (Atomic Signing Standard)
 * Converts a verified quote into a signed transaction and broadcasts to the cluster.
 */

import { Connection, VersionedTransaction, Keypair } from "@solana/web3.js";

export async function executeSwap({
  quoteResponse,
  privateKeyHex,
  rpcUrl = "https://api.mainnet-beta.solana.com"
}: {
  quoteResponse: any;
  privateKeyHex: string;
  rpcUrl?: string;
}) {
  // 1. Establish Signing Authority from Hardware Keys
  const signer = Keypair.fromSecretKey(new Uint8Array(Buffer.from(privateKeyHex, 'hex')));
  
  // 2. Retrieve Transaction Node from Jupiter
  const res = await fetch("https://quote-api.jup.ag/v6/swap", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      quoteResponse,
      userPublicKey: signer.publicKey.toString(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto'
    })
  });

  const swapData = await res.json();

  if (!swapData.swapTransaction) {
    throw new Error(swapData.message || "Institutional Swap Handshake Failed.");
  }

  // 3. Establish Cluster Connection
  const connection = new Connection(rpcUrl, "confirmed");

  // 4. Deserialize & Sign Handshake
  const transaction = VersionedTransaction.deserialize(
    Buffer.from(swapData.swapTransaction, "base64")
  );

  transaction.sign([signer]);

  // 5. Broadcast Binary Payload
  const txid = await connection.sendRawTransaction(
    transaction.serialize(),
    { skipPreflight: true, maxRetries: 2 }
  );

  // 6. Verify Settlement
  await connection.confirmTransaction(txid);

  return txid;
}
