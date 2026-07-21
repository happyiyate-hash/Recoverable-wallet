'use client';

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { AssetRow, ChainConfig, IWalletAdapter } from '@/lib/types';

/**
 * Solana (SOL) Adapter
 * Version: 2.0.0 (Forensic Security Audit Integrated)
 * 
 * Handles real-time balance discovery and account metadata inspection.
 */
class SolanaAdapter implements IWalletAdapter {
    private connection: Connection;

    constructor(chain: ChainConfig) {
        this.connection = new Connection(chain.rpcUrl, "confirmed");
    }

    /**
     * SECURE SCAN ENGINE: Solana Specification Audit
     * Audits token authorities, delegates, and rent-exempt reserves.
     */
    async checkAccountSecurity(address: string, mintAddress?: string) {
        try {
            const pubkey = new PublicKey(address);
            
            // 1. Audit Token Accounts & Rent (Registry Cleanliness)
            const tokenAccounts = await this.connection.getParsedTokenAccountsByOwner(pubkey, {
                programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
            });

            const emptyAccounts = tokenAccounts.value.filter(a => 
                a.account.data.parsed.info.tokenAmount.uiAmount === 0
            );

            // 2. Audit Current Token (if applicable)
            let authorities = { freeze: false, mint: false };
            let delegate = { active: false, amount: 0 };

            if (mintAddress && mintAddress !== 'So11111111111111111111111111111111111111112') {
                try {
                    const mintPubkey = new PublicKey(mintAddress);
                    const mintInfo = await this.connection.getParsedAccountInfo(mintPubkey);
                    const data = (mintInfo.value?.data as any)?.parsed?.info;
                    
                    authorities.freeze = !!data?.freezeAuthority;
                    authorities.mint = !!data?.mintAuthority;

                    // Check for active delegate on the specific token account
                    const userTokenAccount = tokenAccounts.value.find(a => 
                        a.account.data.parsed.info.mint === mintAddress
                    );
                    
                    if (userTokenAccount) {
                        const info = userTokenAccount.account.data.parsed.info;
                        delegate.active = !!info.delegate;
                        delegate.amount = info.delegatedAmount?.uiAmount || 0;
                    }
                } catch (e) {}
            }

            return {
                walletType: "Standard (Individual Node)",
                delegations: delegate.active ? 1 : 0,
                delegateAmount: delegate.amount,
                freezeAuthority: authorities.freeze,
                mintAuthority: authorities.mint,
                reclaimableSol: emptyAccounts.length * 0.002, // Approx rent per account
                emptyAccountsCount: emptyAccounts.length,
                securityScore: authorities.freeze ? 'Moderate' : 'Excellent'
            };
        } catch (error) {
            console.warn("[SOL_SECURITY_SCAN_FAIL]", error);
            return null;
        }
    }

    async fetchBalances(
        ownerAddress: string,
        assets: Omit<AssetRow, 'balance'>[]
    ): Promise<AssetRow[]> {
        try {
            const pubkey = new PublicKey(ownerAddress);
            
            // 1. Fetch Native SOL and ALL SPL Token Accounts in Parallel
            const [solBalance, tokenAccounts] = await Promise.all([
                this.connection.getBalance(pubkey),
                this.connection.getParsedTokenAccountsByOwner(pubkey, {
                    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA")
                })
            ]);

            const balanceSol = (solBalance / LAMPORTS_PER_SOL).toString();

            // 2. Map Registry to Real-time Accounts
            return assets.map(asset => {
                if (asset.symbol === 'SOL' || asset.isNative) {
                    return { ...asset, balance: balanceSol } as AssetRow;
                }

                // Match by Mint Address (Spl Token)
                const splAccount = tokenAccounts.value.find(a => 
                    a.account.data.parsed.info.mint === asset.address
                );

                if (splAccount) {
                    return { 
                        ...asset, 
                        balance: splAccount.account.data.parsed.info.tokenAmount.uiAmountString 
                    } as AssetRow;
                }

                return { ...asset, balance: '0' } as AssetRow;
            });
        } catch (error: any) {
            console.warn(`[SOLANA_ADAPTER_ERROR] ${ownerAddress}:`, error.message);
            return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
        }
    }
}

export const solanaAdapterFactory = (chain: ChainConfig): IWalletAdapter | null => {
    if (chain.type === 'solana') return new SolanaAdapter(chain);
    return null;
};
