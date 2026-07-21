'use client';

import type { WalletWithMetadata, UserProfile, ChainConfig } from '@/lib/types';
import { syncAddressesToCloud } from './services/wallet-actions';

/**
 * INSTITUTIONAL BACKGROUND SYNC WORKER
 * Version: 5.0.0 (Auto-Derive & Column Guard)
 * 
 * Orchestrates a zero-touch audit between hardware derivations and cloud registry.
 * Hardened to detect missing database columns and mismatched identity nodes.
 */

export interface SyncDiagnostic {
  status: 'idle' | 'checking' | 'mismatch' | 'syncing' | 'success' | 'completed' | 'error_missing_column';
  chain: string | null;
  localValue: string | null;
  cloudValue: string | null;
  progress: number;
  errorMessage?: string;
}

export const backgroundSyncWorker = {
  /**
   * Performs a sequential, logic-gated audit of the vault.
   * Verifies each chain node individually to ensure 100% registry accuracy.
   */
  async performCloudAudit(
    userId: string,
    wallets: WalletWithMetadata[],
    profile: UserProfile | null,
    accountNumber: string,
    allChains: ChainConfig[],
    onUpdate: (update: Partial<SyncDiagnostic>) => void,
    checkAborted: () => boolean = () => false
  ) {
    if (!userId || !wallets || wallets.length === 0 || allChains.length === 0) return;

    // Helper for secure dwell times
    const breathe = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const normalize = (addr: string | null | undefined) => (addr || '').toLowerCase().trim();

    // 1. INITIAL SETTLEMENT
    onUpdate({ status: 'checking', progress: 0, errorMessage: undefined });
    await breathe(800); 

    if (checkAborted()) { onUpdate({ status: 'idle' }); return; }

    // 2. CONSTRUCT AUDIT SEQUENCE
    const sequence: any[] = [];

    // Group EVM nodes for efficiency
    const localEvm = wallets.find(w => w.type === 'evm');
    sequence.push({
      label: 'EVM Registry',
      type: 'evm',
      localAddr: localEvm?.address || null,
      cloudAddr: profile?.evm_address || null
    });

    // Individual Native nodes
    allChains.forEach(c => {
      if (c.type && c.type !== 'evm') {
        const localWallet = wallets.find(w => w.type === c.type);
        const fieldName = `${c.type}_address`;
        sequence.push({
          label: c.name,
          type: c.type,
          localAddr: localWallet?.address || null,
          cloudAddr: (profile as any)?.[fieldName] || null
        });
      }
    });

    const totalSteps = sequence.length;
    let completed = 0;

    // 3. SEQUENTIAL AUDIT LOOP
    for (const node of sequence) {
      if (checkAborted()) {
        onUpdate({ status: 'idle' });
        return;
      }

      // PHASE A: SCANNING
      onUpdate({ 
        status: 'checking',
        chain: node.label, 
        localValue: node.localAddr, 
        cloudValue: node.cloudAddr,
        progress: (completed / totalSteps) * 100
      });

      await breathe(400); 

      // PHASE B: LOGICAL COMPARISON (Normalized)
      const local = normalize(node.localAddr);
      const cloud = normalize(node.cloudAddr);
      
      if (!local) {
        completed++;
        continue; // Skip if no local derivation exists yet
      }

      const isMissingInCloud = !cloud;
      const isMismatch = !!cloud && local !== cloud;

      if (isMissingInCloud || isMismatch) {
        onUpdate({ status: 'mismatch' });
        await breathe(1000); 

        if (checkAborted()) { onUpdate({ status: 'idle' }); return; }

        // PHASE C: ATOMIC REPAIR & COLUMN GUARD
        onUpdate({ status: 'syncing' });
        
        try {
          // Attempt atomic cloud vaulting
          await syncAddressesToCloud(userId, wallets, accountNumber);
          onUpdate({ cloudValue: node.localAddr });
          await breathe(500); 
        } catch (e: any) {
          // 🛡️ COLUMN GUARD: Catch missing database columns
          const errorMsg = e.message || String(e);
          if (errorMsg.includes('column') || errorMsg.includes('42703')) {
            onUpdate({ 
              status: 'error_missing_column', 
              chain: node.label,
              errorMessage: `Registry node "${node.type}_address" is missing in your database. Please run the SQL command provided in the terminal.` 
            });
            return; // HALT sequence on structural error
          }
          
          console.warn(`[REGISTRY_REPAIR_FAIL] ${node.label}:`, errorMsg);
          onUpdate({ status: 'idle' });
          return;
        }
      }

      // PHASE D: VERIFICATION SUCCESS
      onUpdate({ status: 'success' });
      completed++;
      
      await breathe(200); 
      onUpdate({ progress: (completed / totalSteps) * 100 });
    }

    // 4. FINAL COMPLETION HANDSHAKE
    if (!checkAborted()) {
      onUpdate({ status: 'completed', chain: 'VAULT INTEGRITY', progress: 100 });
      await breathe(2000); 
      onUpdate({ status: 'idle', progress: 0 });
    }
  }
};
