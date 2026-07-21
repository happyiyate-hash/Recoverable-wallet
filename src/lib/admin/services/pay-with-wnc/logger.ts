
'use server';

import { supabase } from '@/lib/supabase/client';

/**
 * PAY WITH WNC: TRANSACTION LOGGER
 * Version: 1.0.0
 * 
 * Provides an immutable record of admin-fulfilled sponsored dispatches.
 */

export interface LogPayload {
    userId: string;
    from: string;
    to: string;
    token: string;
    amount: number;
    txHash: string;
    status: 'completed' | 'failed';
    reference?: string;
}

export async function logAdminTransaction(payload: LogPayload) {
    if (!supabase) return null;

    try {
        const { data, error } = await supabase
            .from('admin_transactions')
            .insert({
                user_id: payload.userId,
                admin_address: payload.from,
                recipient_address: payload.to,
                token_symbol: payload.token,
                amount: payload.amount,
                tx_hash: payload.txHash,
                status: payload.status,
                reference: payload.reference || 'Sponsored dispatch',
                created_at: new Date().toISOString()
            });

        if (error) {
            console.error("[LOGGER_ADVISORY] Failed to write to admin_transactions:", error.message);
        }

        return data;
    } catch (e) {
        console.error("[LOGGER_CRITICAL] Registry log handshake failed.");
        return null;
    }
}
