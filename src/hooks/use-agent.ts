'use client';

import { useState, useCallback } from 'react';
import { manageVault, type CopilotOutput } from '@/ai/flows/copilot-flow';
import { useWallet } from '@/contexts/wallet-provider';
import { useUser } from '@/contexts/user-provider';
import { useAppTheme } from '@/contexts/theme-provider';

/**
 * INSTITUTIONAL AGENT HOOK (SENTINEL V8.1)
 * Version: 12.0.0 (Tier & Theme Context Integration)
 */
export function useAgent() {
  const { allAssets, viewingNetwork } = useWallet();
  const { user, profile } = useUser();
  const { activeTheme } = useAppTheme();
  
  const [isThinking, setIsThinking] = useState(false);
  const [lastResponse, setLastResponse] = useState<CopilotOutput | null>(null);

  const runAgent = useCallback(async (message: string, history: any[]) => {
    if (!user) return;
    
    setIsThinking(true);
    setLastResponse(null);

    try {
      // 🧠 BIND LIVE REGISTRY CONTEXT
      // Injected Tier and Theme nodes for V8.1 reasoning
      const result = await manageVault({
        message,
        history: history.map(h => ({ 
          role: h.role === 'user' ? 'user' : 'assistant', 
          content: h.content 
        })),
        context: {
          activeNetwork: viewingNetwork?.name || 'Ethereum',
          currentUserId: user.id,
          userName: profile?.name,
          tier: profile?.plan_type || 'Free',
          activeTheme: activeTheme.name,
          balances: allAssets.map(a => ({
            symbol: a.symbol,
            balance: a.balance,
            usdValue: a.fiatValueUsd || 0,
            address: a.address
          }))
        }
      });

      setLastResponse(result);
      return result;
    } catch (e) {
      console.error("[AGENT_RUN_FAIL]", e);
      return {
        mode: 'chat',
        message: "Neural handshake interrupted. Please verify your network node.",
        thinking: "The AI Control Plane encountered a runtime exception during tool execution."
      } as CopilotOutput;
    } finally {
      setIsThinking(false);
    }
  }, [allAssets, viewingNetwork, user, profile, activeTheme]);

  return { runAgent, isThinking, lastResponse };
}
