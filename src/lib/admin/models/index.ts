/**
 * MASTER ADMIN DATA MODELS
 */

export interface AdminTransaction {
  id: string;
  user_id: string;
  chain_type: string;
  token_symbol: string;
  amount: number;
  tx_hash: string;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export interface AdminSwap {
  id: string;
  user_id: string;
  from_symbol: string;
  to_symbol: string;
  from_amount: number;
  to_amount_expected: number;
  user_tx_hash?: string;
  admin_tx_hash?: string;
  status: 'pending' | 'user_sent' | 'completed' | 'failed';
}

export interface AdminEscrow {
  id: string;
  user_id: string;
  asset: string;
  amount: number;
  status: 'locked' | 'released' | 'refunded';
  reference: string;
}
