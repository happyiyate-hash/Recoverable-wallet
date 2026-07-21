import { useState, useEffect } from 'react';
// Import the generated WASM glue code
import init, { get_full_portfolio } from '../../engine/pkg/wallet_engine';

export const useEngine = (rpcUrl: string, userAddress: string, tokenList: string[]) => {
  const [portfolio, setPortfolio] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const runEngine = async () => {
      try {
        // 1. Initialize the WASM binary (only happens once)
        await init();

        // 2. Execute the lightning-fast Rust Multicall
        const data = await get_full_portfolio(rpcUrl, userAddress, tokenList);
        
        setPortfolio(data);
      } catch (err: any) {
        console.error("WNC Engine Error:", err);
        setError(err.toString());
      } finally {
        setIsLoading(false);
      }
    };

    if (userAddress && rpcUrl) {
      runEngine();
    }
  }, [rpcUrl, userAddress, tokenList]);

  return { portfolio, isLoading, error };
};
