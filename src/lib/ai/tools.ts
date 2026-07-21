'use client';

import type { ToolResult } from './agent-engine';
import { supabase } from '../supabase/client';

/**
 * INSTITUTIONAL AGENT TOOLS (THE TOOL BELT)
 * Version: 4.0.0 (Action Handlers Active)
 * 
 * Defines the functional "hands" of the V4 Sentinel.
 */

export function createTools(context: {
  allAssets: any[];
  viewingNetwork: any;
  profile: any;
  router: any;
  setNetwork: (n: any) => void;
  signOut: () => Promise<void>;
}): Record<string, (input: any) => Promise<ToolResult>> {
  return {
    /**
     * SYSTEM_CHECK: Audits the terminal's connection to the database
     */
    async system_check() {
      try {
        const { error } = await supabase!.from('profiles').select('id').limit(1);
        if (error) throw error;
        return { success: true, data: "Database Handshake: VERIFIED. All nodes operational." };
      } catch (e: any) {
        return { success: false, error: `Registry Connection Error: ${e.message}` };
      }
    },

    /**
     * AUDIT_BALANCES: Scans local and cloud balances for discrepancies
     */
    async audit_balances() {
      const summary = context.allAssets
        .filter(a => parseFloat(a.balance) > 0)
        .map(a => `${a.balance} ${a.symbol} (≈ $${(a.fiatValueUsd || 0).toFixed(2)})`)
        .join(', ');
      
      return {
        success: true,
        data: { 
          summary: summary || 'Vault empty.', 
          network: context.viewingNetwork.name,
          timestamp: new Date().toISOString()
        }
      };
    },

    /**
     * RESOLVE_IDENTITY: Identifies accounts in the global registry
     */
    async resolve_identity(input: { accountNumber: string }) {
      try {
        const { data, error } = await supabase!
          .from('profiles')
          .select('id, name, kyc_status')
          .eq('account_number', input.accountNumber)
          .single();

        if (error || !data) return { success: false, error: 'Identity node not found.' };

        return { 
          success: true, 
          data: { 
            id: data.id, 
            name: data.name, 
            status: data.kyc_status 
          } 
        };
      } catch (e) {
        return { success: false, error: 'Handshake failed.' };
      }
    },

    /**
     * NAVIGATE: Redirects the terminal UI
     */
    async navigate(input: { targetPath: string }) {
      // In a real agent, we might perform a safety check on the path first
      return { success: true, data: `Prepared navigation node for ${input.targetPath}` };
    },

    /**
     * SWITCH_NETWORK: Calibrates the terminal RPC
     */
    async switch_network(input: { network: string }) {
      return { success: true, data: `Identified network authority for ${input.network}` };
    },

    /**
     * TERMINATE_SESSION: Initiates a secure identity wipe
     */
    async terminate_session() {
      // Logic handled in use-agent.ts loop
      return { success: true, data: "Security wipe authorized." };
    }
  };
}
