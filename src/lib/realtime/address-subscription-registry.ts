'use client';

/**
 * ADDRESS SUBSCRIPTION REGISTRY
 * 
 * Central registry that tracks watched wallet addresses and token contract addresses.
 * Eliminates duplicate registrations and isolates listeners by chain ID.
 */
export class AddressSubscriptionRegistry {
  private static instance: AddressSubscriptionRegistry | null = null;

  // Maps chainId -> Set of lowercase wallet addresses
  private watchedAddresses: Map<number, Set<string>> = new Map();

  // Maps chainId -> Set of lowercase token addresses
  private watchedTokens: Map<number, Set<string>> = new Map();

  private constructor() {}

  public static getInstance(): AddressSubscriptionRegistry {
    if (!AddressSubscriptionRegistry.instance) {
      AddressSubscriptionRegistry.instance = new AddressSubscriptionRegistry();
    }
    return AddressSubscriptionRegistry.instance;
  }

  /**
   * Registers a wallet address on a specific chain.
   * Returns true if it is a new registration, false if already watched.
   */
  public registerAddress(address: string, chainId: number): boolean {
    if (!address) return false;
    const addr = address.toLowerCase();

    if (!this.watchedAddresses.has(chainId)) {
      this.watchedAddresses.set(chainId, new Set());
    }

    const set = this.watchedAddresses.get(chainId)!;
    if (set.has(addr)) {
      return false; // Already watching
    }

    set.add(addr);
    console.log(`[REGISTRY] Registered address ${address.slice(0, 8)}... on chain ${chainId}`);
    return true;
  }

  /**
   * Unregisters a wallet address from a specific chain.
   * Returns true if the address was removed, false if it wasn't tracked.
   */
  public unregisterAddress(address: string, chainId: number): boolean {
    if (!address) return false;
    const addr = address.toLowerCase();

    const set = this.watchedAddresses.get(chainId);
    if (!set || !set.has(addr)) {
      return false;
    }

    set.delete(addr);
    console.log(`[REGISTRY] Unregistered address ${address.slice(0, 8)}... from chain ${chainId}`);
    return true;
  }

  /**
   * Registers a watched token contract on a specific chain.
   * Returns true if newly added, false if already tracked.
   */
  public registerToken(tokenAddress: string, chainId: number): boolean {
    if (!tokenAddress) return false;
    const token = tokenAddress.toLowerCase();

    if (!this.watchedTokens.has(chainId)) {
      this.watchedTokens.set(chainId, new Set());
    }

    const set = this.watchedTokens.get(chainId)!;
    if (set.has(token)) {
      return false; // Already watching
    }

    set.add(token);
    console.log(`[REGISTRY] Registered contract token ${tokenAddress} on chain ${chainId}`);
    return true;
  }

  /**
   * Unregisters a token contract from a specific chain.
   */
  public unregisterToken(tokenAddress: string, chainId: number): boolean {
    if (!tokenAddress) return false;
    const token = tokenAddress.toLowerCase();

    const set = this.watchedTokens.get(chainId);
    if (!set || !set.has(token)) {
      return false;
    }

    set.delete(token);
    console.log(`[REGISTRY] Unregistered contract token ${tokenAddress} from chain ${chainId}`);
    return true;
  }

  /**
   * Returns all active watched wallet addresses on a specific chain.
   */
  public getAddressesForChain(chainId: number): string[] {
    const set = this.watchedAddresses.get(chainId);
    return set ? Array.from(set) : [];
  }

  /**
   * Returns all active watched token contracts on a specific chain.
   */
  public getTokensForChain(chainId: number): string[] {
    const set = this.watchedTokens.get(chainId);
    return set ? Array.from(set) : [];
  }

  /**
   * Checks if a wallet address is watched on a chain.
   */
  public isWatchingAddress(address: string, chainId: number): boolean {
    if (!address) return false;
    const set = this.watchedAddresses.get(chainId);
    return set ? set.has(address.toLowerCase()) : false;
  }

  /**
   * Checks if a token address is watched on a chain.
   */
  public isWatchingToken(tokenAddress: string, chainId: number): boolean {
    if (!tokenAddress) return false;
    const set = this.watchedTokens.get(chainId);
    return set ? set.has(tokenAddress.toLowerCase()) : false;
  }

  /**
   * Clears the entire registry.
   */
  public clearAll() {
    this.watchedAddresses.clear();
    this.watchedTokens.clear();
    console.log("[REGISTRY] Subscription registry wiped.");
  }
}

export const addressSubscriptionRegistry = AddressSubscriptionRegistry.getInstance();
