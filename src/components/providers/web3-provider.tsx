
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';
import { WagmiProvider } from 'wagmi';
import { mainnet, polygon, base, arbitrum, optimism } from 'wagmi/chains';
import { createAppKit } from '@reown/appkit/react';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';

/**
 * INSTITUTIONAL WEB3 PROVIDER
 * Version: 3.6.0 (Modular Import Stability)
 */

const projectId = '3c39384fb4a1a4b22a43630aaf676941';

const networks = [mainnet, polygon, base, arbitrum, optimism];

export function Web3Provider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const wagmiAdapter = useMemo(() => new WagmiAdapter({
    projectId,
    networks
  }), []);

  const queryClient = useMemo(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  }), []);

  // Initialize AppKit once on the client with Robust Handshake
  useEffect(() => {
    if (typeof window !== 'undefined' && mounted) {
      const metadata = {
        name: 'Node Quick',
        description: 'Institutional Multi-Chain Vault Node',
        url: window.location.origin,
        icons: ['https://gcghriodmljkusdduhzl.supabase.co/storage/v1/object/public/logos/node-quick-icon.png']
      };

      try {
        // ATOMIC HANDSHAKE: Attempt initialization with modern adapter pattern
        createAppKit({
          adapters: [wagmiAdapter],
          networks: [mainnet, polygon, base, arbitrum, optimism],
          projectId,
          metadata,
          features: {
            analytics: true
          }
        });
      } catch (error: any) {
        console.warn("[WEB3_PROVIDER_ADVISORY] AppKit initialization deferred. This usually indicates an unauthorized origin or module mismatch.");
      }
    }
  }, [wagmiAdapter, mounted]);

  if (!mounted) return null;

  return (
    <WagmiProvider config={wagmiAdapter.wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
