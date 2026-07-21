import { ProviderId } from './types';
import { EVM_PROVIDERS } from './providers';

export async function buildTransaction(quote: any, userAddress: string) {
  const { provider, tx } = quote;
  const providerId = quote.providerId as ProviderId;
  
  console.log(`[TX_BUILDER] Building payload for node: ${providerId}`);

  const matchedProvider = EVM_PROVIDERS.find(p => p.id === providerId);
  
  if (!matchedProvider) {
    throw new Error(`Registry Advisory: Unsupported provider identity [${providerId}]`);
  }

  try {
    const txData = await matchedProvider.buildTransaction(quote, userAddress);
    console.log(`[TX_BUILDER] Payload generated successfully for ${matchedProvider.name}`);
    return txData;
  } catch (error: any) {
    console.error(`[TX_BUILDER] Failed to build transaction for ${providerId}:`, error.message);
    throw error;
  }
}
