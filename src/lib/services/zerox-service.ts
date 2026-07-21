
'use client';

/**
 * INSTITUTIONAL 0X AGGREGATOR SERVICE (PROXY ONLY)
 * Version: 4.1.0 (Detailed Error Propagation)
 * 
 * Strictly routes all requests through the backend proxy.
 * Prevents CORS failures and API key exposure.
 * Now captures and surfaces specific protocol error messages.
 */

export const zeroXService = {
  /**
   * Fetches an indicative price from the secure proxy.
   */
  async getPrice(chainId: number, sellToken: string, buyToken: string, sellAmount: string, takerAddress?: string) {
    const params = new URLSearchParams({
      chainId: chainId.toString(),
      mode: 'price',
      sellToken,
      buyToken,
      sellAmount
    });

    if (takerAddress) params.append('takerAddress', takerAddress);

    const response = await fetch(`/api/swap/0x-proxy?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '0x Protocol Handshake Failed');
    }

    return data;
  },

  /**
   * Generates a signed quote for execution via the secure proxy.
   */
  async getQuote(chainId: number, sellToken: string, buyToken: string, sellAmount: string, takerAddress: string) {
    const params = new URLSearchParams({
      chainId: chainId.toString(),
      mode: 'quote',
      sellToken,
      buyToken,
      sellAmount,
      takerAddress
    });

    const response = await fetch(`/api/swap/0x-proxy?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || '0x Execution Handshake Failed');
    }

    return data;
  }
};
