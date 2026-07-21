'use client';

import { Alchemy, Network, NftFilters } from "alchemy-sdk";
import type { NFTItem, MarketplaceAd, WhaleActivity } from '@/lib/types';
import { ethers } from 'ethers';

/**
 * INSTITUTIONAL NFT DISCOVERY & EXECUTION SERVICE
 * Version: 7.0.0 (High-Density Marketplace Sync)
 */

const ALCHEMY_KEY = "OavIajgLF0PNfqGpd31B_";

const getAlchemy = (chainId: number) => {
  const network = chainId === 137 ? Network.MATIC_MAINNET : Network.ETH_MAINNET;
  return new Alchemy({ apiKey: ALCHEMY_KEY, network });
};

export const nftService = {
  /**
   * Fetches marketplace NFTs with mock "ads" and "whale activity" for gravity.
   */
  async fetchMarketplaceUnified(chainId: number = 1) {
    try {
      const nfts = await this.fetchMarketplaceNFTs(chainId);
      
      const ads: MarketplaceAd[] = [
        { id: 'ad-1', type: 'buy', token: 'USDT', price: '$1.00', fee: '0% Fee', network: 'Ethereum' },
        { id: 'ad-2', type: 'buy', token: 'BTC', price: '$63,245.12', fee: '1.2% Fee', network: 'Bitcoin' },
        { id: 'ad-3', type: 'buy', token: 'ETH', price: '$3,502.45', fee: '1.0% Fee', network: 'Ethereum' },
        { id: 'ad-4', type: 'buy', token: 'SOL', price: '$145.30', fee: '0.5% Fee', network: 'Solana' },
        { id: 'ad-5', type: 'sell', token: 'USDC', price: '$0.999', fee: '0% Fee', network: 'Polygon' },
      ];

      const activity: WhaleActivity[] = [
        { id: 'w-1', user: 'velvet_node', message: 'Bought 120 ETH of PEPE', timestamp: '2m ago', type: 'buy' },
        { id: 'w-2', user: 'storm_rider', message: 'Entering SOL memecoin node', timestamp: '5m ago', type: 'buy' },
        { id: 'w-3', user: 'nexus_finder', message: 'Locked 1M WNC for Escrow', timestamp: '12m ago', type: 'move' },
        { id: 'w-4', user: 'alpha_op', message: 'Dispatched 50 BTC to Cold Storage', timestamp: '15m ago', type: 'sell' },
      ];

      return { nfts, ads, activity };
    } catch (e) {
      return { nfts: [], ads: [], activity: [] };
    }
  },

  async fetchUserNFTs(walletAddress: string, chainId: number): Promise<NFTItem[]> {
    if (!walletAddress) return [];
    try {
      const alchemy = getAlchemy(chainId);
      const nfts = await alchemy.nft.getNftsForOwner(walletAddress, {
        excludeFilters: [NftFilters.SPAM]
      });
      return nfts.ownedNfts.map(nft => this.mapNftToItem(nft, chainId));
    } catch (error: any) {
      return [];
    }
  },

  async fetchMarketplaceNFTs(chainId: number = 1): Promise<NFTItem[]> {
    try {
      const alchemy = getAlchemy(chainId);
      const collections = chainId === 137 
        ? ["0x2953399124f0cbb46d2cbacd8a89cf0599974963"] 
        : ["0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d", "0xED5AF388653567Af2F388E6224dC7C4b3241C544", "0xb47e3cd837ddf8e4c57f05d70ab865de6e193bbb"];
      
      const promises = collections.map(addr => alchemy.nft.getNftsForContract(addr, { pageSize: 8 }));
      const results = await Promise.all(promises);
      const merged = results.flatMap(r => r.nfts);
      
      return merged.map(nft => this.mapNftToItem(nft, chainId));
    } catch (e) {
      return [];
    }
  },

  async getNFTDetails(contract: string, tokenId: string, chainId: number = 1): Promise<NFTItem | null> {
    try {
      const alchemy = getAlchemy(chainId);
      const metadata = await alchemy.nft.getNftMetadata(contract, tokenId);
      const item = this.mapNftToItem(metadata, chainId);
      // Inject some mock pricing for high-fidelity feel
      item.price = 32.70;
      item.bestOffer = 31.20;
      return item;
    } catch (e) {
      return null;
    }
  },

  async transferNFT(params: {
    contractAddress: string;
    tokenId: string;
    fromAddress: string;
    toAddress: string;
    rpcUrl: string;
    privateKey: string;
  }) {
    const provider = new ethers.JsonRpcProvider(params.rpcUrl);
    const wallet = new ethers.Wallet(params.privateKey, provider);
    const abi = ["function safeTransferFrom(address from, address to, uint256 tokenId)"];
    const contract = new ethers.Contract(params.contractAddress, abi, wallet);
    const tx = await contract["safeTransferFrom(address,address,uint256)"](
      params.fromAddress,
      params.toAddress,
      params.tokenId
    );
    return await tx.wait();
  },

  mapNftToItem(nft: any, chainId: number): NFTItem {
    const contractAddr = nft.contract?.address || nft.contract;
    const tokenId = nft.tokenId || (nft.id?.tokenId ? nft.id.tokenId : String(nft.id));
    return {
      id: `${chainId}-${contractAddr}-${tokenId}`,
      contractAddress: contractAddr,
      tokenId: tokenId,
      name: nft.title || nft.name || nft.rawMetadata?.name || `Node #${tokenId?.slice(0, 6)}`,
      description: nft.description || nft.rawMetadata?.description || "Institutional digital asset node.",
      imageUrl: nft.image?.gateway || nft.media?.[0]?.gateway || nft.rawMetadata?.image || 'https://picsum.photos/seed/nft/400/400',
      collectionName: nft.contract?.name || nft.collection?.name || "Registry Collection",
      chainId: chainId,
      type: nft.tokenType as any,
      price: nft.contract?.openSea?.floorPrice || 0,
      traits: nft.rawMetadata?.attributes?.map((a: any) => ({ 
        trait_type: a.trait_type, 
        value: a.value 
      })) || []
    };
  }
};
