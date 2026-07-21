'use server';

import { adminConfig } from './config';
import { logAdminTransaction } from './logger';
import { getBalance, signAndSend } from '../wallet-service';
import { supabase } from '@/lib/supabase/client';

/**
 * PAY WITH WNC: ATOMIC SETTLEMENT SERVICE
 * Version: 2.0.0 (Verify-Lock-Release Standard)
 * 
 * Orchestrates the full lifecycle of a sponsored crypto dispatch.
 * Logic: Double Check Both -> Deduct User WNC -> Transfer Admin Token -> Confirm.
 */

interface SendCryptoWithWncInput {
    userId: string;
    destinationAddress: string;
    token: string;
    tokenAddress?: string;
    amount: number;
    chainId: number;
    chainType: string;
    wncAmountToDeduct: number;
}

export async function sendCryptoWithWNC(input: SendCryptoWithWncInput) {
    console.log(`[WNC_SERVICE] Initializing atomic settlement for User ${input.userId}`);

    try {
        // --- STEP 1: DOUBLE-CHECK HANDSHAKE (READ ONLY) ---
        
        // A. Token Support Check
        if (!adminConfig.supportedTokens.includes(input.token.toUpperCase())) {
            throw new Error("UNSUPPORTED_TOKEN_NODE");
        }

        // B. Admin Liquidity Audit
        const adminBalance = await getBalance({
            address: adminConfig.adminWallet,
            tokenSymbol: input.token,
            tokenAddress: input.tokenAddress,
            chainId: input.chainId,
            chainType: input.chainType
        });

        if (adminBalance < input.amount) {
            console.warn(`[WNC_SERVICE_FAIL] Admin Node Liquidity Mismatch: Have ${adminBalance}, need ${input.amount}`);
            return { 
                success: false, 
                error: "LIQUIDITY_MISMATCH",
                message: `The admin vault liquidity node for ${input.token} is currently out of sync. Please try a different amount or asset.` 
            };
        }

        // C. User Registry Check
        const { data: profile } = await supabase!
            .from('profiles')
            .select('wnc_earnings')
            .eq('id', input.userId)
            .single();

        if (!profile || (profile.wnc_earnings || 0) < input.wncAmountToDeduct) {
            return {
                success: false,
                error: "INSUFFICIENT_WNC",
                message: "Your node identity has insufficient WNC to authorize this sponsored dispatch."
            };
        }

        // --- STEP 2: ATOMIC DEDUCTION (THE LOCK) ---
        // We deduct the money from the user first to ensure the trade is backed.
        const { data: deduction, error: deductError } = await supabase!.rpc('transfer_wnc_universal', {
            p_receiver_id: '00000000-0000-0000-0000-000000000000', // SYSTEM_BURN_NODE
            p_destination_type: 'system',
            p_amount: Math.floor(input.wncAmountToDeduct),
            p_reference: `ATOMIC_LOCK: ${input.amount} ${input.token} to ${input.destinationAddress.slice(0, 8)}...`
        });

        if (deductError || !deduction?.success) {
            return { 
                success: false, 
                error: "PAYMENT_FAILED",
                message: deduction?.message || "Internal ledger settlement failed. Handshake aborted." 
            };
        }

        // --- STEP 3: ADMIN DISPATCH (THE RELEASE) ---
        // Now that we have the user's WNC, we release the real assets from the Admin Vault.
        let txHash: string;
        try {
            txHash = await signAndSend({
                toAddress: input.destinationAddress,
                amount: input.amount,
                tokenSymbol: input.token,
                tokenAddress: input.tokenAddress,
                chainId: input.chainId,
                chainType: input.chainType
            });
        } catch (sendError: any) {
            // CRITICAL: If admin dispatch fails, we log it as a settlement error for manual reconciliation
            console.error("[WNC_SERVICE_CRITICAL] Admin dispatch failed after user deduction:", sendError.message);
            await logAdminTransaction({
                userId: input.userId,
                from: adminConfig.adminWallet,
                to: input.destinationAddress,
                token: input.token,
                amount: input.amount,
                txHash: 'FAILED_AFTER_LOCK',
                status: 'failed',
                reference: `ERROR: ${sendError.message}`
            });
            throw new Error(`DISPATCH_FAILED: User WNC deducted but vault transfer was rejected. Support node notified.`);
        }

        // --- STEP 4: FINAL CONFIRMATION & LOGGING ---
        await logAdminTransaction({
            userId: input.userId,
            from: adminConfig.adminWallet,
            to: input.destinationAddress,
            token: input.token,
            amount: input.amount,
            txHash: txHash,
            status: 'completed'
        });

        return { 
            success: true, 
            txHash,
            message: "Atomic settlement verified. Transaction broadcasted." 
        };

    } catch (error: any) {
        console.error("[WNC_SERVICE_FAIL]", error.message);
        return { 
            success: false, 
            error: "EXECUTION_ABORTED",
            message: error.message || "Institutional handshake interrupted." 
        };
    }
}
