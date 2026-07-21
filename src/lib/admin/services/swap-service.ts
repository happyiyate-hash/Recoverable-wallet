'use server';

import { supabase } from '@/lib/supabase/client';
import { signAndSend } from './wallet-service';
import { validateTransaction } from './ai-service';
import { ADMIN_VAULT } from '../config/blockchain';

/**
 * MASTER SWAP ORCHESTRATION SERVICE
 * Version: 2.1.0 (Named Exports Standard)
 */

export interface SwapHandshake {
  userId: string;
  fromChain: string;
  toChain: string;
  fromSymbol: string;
  toSymbol: string;
  fromAmount: number;
  toAmountExpected: number;
  recipientAddress: string;
}

export async function initiateHandshake(input: SwapHandshake) {
  // 1. Audit via Sentinel (AI)
  const isSafe = await validateTransaction(input);
  if (!isSafe) throw new Error("SECURITY_NODE_DENIED");

  // 2. Provision Ledger Record
  const { data: swap, error } = await supabase
    .from('swaps')
    .insert({
      user_id: input.userId,
      from_chain: input.fromChain,
      to_chain: input.toChain,
      from_symbol: input.fromSymbol,
      to_symbol: input.toSymbol,
      from_amount: input.fromAmount,
      to_amount_expected: input.toAmountExpected,
      status: 'pending'
    })
    .select('id')
    .single();

  if (error) throw error;

  return { 
    swapId: swap.id, 
    adminDepositAddress: ADMIN_VAULT.evm 
  };
}

export async function fulfillSettlement(swapId: string, userTxHash: string) {
  // 1. Update Settlement State
  await supabase.from('swaps').update({ 
    user_tx_hash: userTxHash, 
    status: 'user_sent' 
  }).eq('id', swapId);

  // 2. Fetch Transaction Metadata
  const { data: swap } = await supabase.from('swaps').select('*').eq('id', swapId).single();
  if (!swap) throw new Error("SWAP_NODE_NOT_FOUND");

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', swap.user_id).single();
  if (!profile) throw new Error("IDENTITY_MISSING");

  // 3. Execute Disbursment Leg
  const chainType = swap.to_chain.toLowerCase().includes('solana') ? 'solana' : 'evm';
  const targetAddress = chainType === 'solana' ? profile.solana_address : profile.evm_address;

  if (!targetAddress) throw new Error("RECIPIENT_NODE_MISSING");

  const adminTxHash = await signAndSend({
    toAddress: targetAddress,
    amount: swap.to_amount_expected,
    tokenSymbol: swap.to_symbol,
    chainId: 1, 
    chainType: chainType
  });

  await supabase.from('swaps').update({ 
    admin_tx_hash: adminTxHash, 
    status: 'completed' 
  }).eq('id', swapId);

  return adminTxHash;
}
