'use client';

import { ethers } from 'ethers';
import type { AssetRow, ChainConfig, IWalletAdapter } from '@/lib/types';
import { getRPC } from '../services/rpc-service';
import { securityIntelligence } from '@/lib/services/security-intelligence';

/**
 * EVM Adapter
 * Handles all EVM and EVM-Compatible chains using standard JSON-RPC.
 * Version: 3.1.0 (Fixed Approval Handshake Accuracy)
 */
class EvmAdapter implements IWalletAdapter {
    private provider: ethers.JsonRpcProvider | null = null;
    private chain: ChainConfig;

    constructor(chain: ChainConfig, infuraKey: string | null, alchemyKey: string | null) {
        this.chain = chain;
        try {
            const rpcUrl = getRPC(chain.name, infuraKey, alchemyKey);
            this.provider = new ethers.JsonRpcProvider(rpcUrl, undefined, { staticNetwork: true });
        } catch (e) {
            console.error(`EVM Provider Init Error for ${chain.name}:`, e);
        }
    }

    /**
     * SECURE SCAN ENGINE: EVM Specification Audit
     * Audits wallet type, gas status, and approval risk.
     */
    async checkAccountSecurity(address: string) {
        if (!this.provider) return null;

        try {
            // 1. Audit Wallet Architecture (EOA vs Contract)
            const code = await this.provider.getCode(address);
            const isContract = code !== '0x';
            
            // 2. Audit Gas Registry
            const balance = await this.provider.getBalance(address);
            const balanceEth = parseFloat(ethers.formatEther(balance));
            
            // 3. Signature & Approval Handshake (Precise Audit)
            // Rule: No more random risk levels. We only report based on strictly verified nodes.
            const approvals = await securityIntelligence.checkEVMApprovals(address, this.chain.chainId);

            return {
                walletType: isContract ? 'Smart Contract Wallet' : 'EOA (Individual Node)',
                isMultisig: isContract && code.length > 500,
                gasStatus: balanceEth > 0.005 ? 'Optimal' : 'Low Gas Warning',
                activeApprovals: approvals.count,
                unlimitedApprovals: approvals.unlimited,
                securityScore: securityIntelligence.calculateEVMScore(isContract, approvals.unlimited, balanceEth)
            };
        } catch (error) {
            return null;
        }
    }

    async fetchBalances(
        ownerAddress: string,
        assets: Omit<AssetRow, 'balance'>[]
    ): Promise<AssetRow[]> {
        if (!this.provider) {
            return assets.map(asset => ({ ...asset, balance: '0' }) as AssetRow);
        }

        const balancePromises = assets.map(async (asset): Promise<AssetRow> => {
            try {
                let balanceBigInt: bigint;
                const decimals = asset.decimals || 18;

                if (asset.isNative || asset.address === '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee' || asset.address === asset.symbol) {
                    balanceBigInt = await this.provider!.getBalance(ownerAddress);
                    return {
                        ...asset,
                        balance: ethers.formatUnits(balanceBigInt, decimals),
                    } as AssetRow;
                } else {
                    const abi = ["function balanceOf(address owner) view returns (uint256)"];
                    const contract = new ethers.Contract(asset.address, abi, this.provider!);
                    balanceBigInt = await contract.balanceOf(ownerAddress);
                    
                    return {
                        ...asset,
                        balance: ethers.formatUnits(balanceBigInt, decimals),
                    } as AssetRow;
                }
            } catch (error) {
                return { ...asset, balance: '0' } as AssetRow;
            }
        });

        return Promise.all(balancePromises);
    }
}

export const evmAdapterFactory = (chain: ChainConfig, infuraKey: string | null, alchemyKey: string | null): IWalletAdapter | null => {
    if (chain.type === 'evm' || !chain.type) return new EvmAdapter(chain, infuraKey, alchemyKey);
    return null;
};
