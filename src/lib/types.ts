export interface AssetRow {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  balance: string;
  fiatValueUsd?: number;
  priceUsd?: number;
  pctChange24h?: number;
  iconUrl?: string | null;
  isNative?: boolean;
  coingeckoId?: string;
  updatedAt?: number;
  decimals?: number;
  priceSource?: 'coingecko' | 'dex' | 'manual';
  dexPair?: string;
  priceId?: string;
}

export interface WalletWithMetadata {
  address: string;
  ensName?: string;
  avatarUrl?: string;
  privateKey?: string;
  seed?: string; // For XRP
  type: 'evm' | 'xrp' | 'polkadot' | 'kusama' | 'near' | 'btc' | 'ltc' | 'doge' | 'solana' | 'cosmos' | 'osmosis' | 'secret' | 'injective' | 'celestia' | 'cardano' | 'tron' | 'algorand' | 'hedera' | 'tezos' | 'aptos' | 'sui' | 'starknet' | 'bep2' | 'bitcoin-cash';
  isMultiSigner?: boolean;
  multiSignerThreshold?: number;
  multiSignerKeys?: number;
}

export interface ChainConfig {
    chainId: number;
    name: string;
    symbol: string;
    rpcUrl: string;
    explorer?: string;
    iconUrl?: string | null;
    coingeckoId?: string;
    themeColor?: string;
    type?: 'evm' | 'xrp' | 'polkadot' | 'kusama' | 'near' | 'btc' | 'ltc' | 'doge' | 'solana' | 'cosmos' | 'osmosis' | 'secret' | 'celestia' | 'cardano' | 'tron' | 'algorand' | 'hedera' | 'tezos' | 'aptos' | 'sui' | 'starknet' | 'bep2' | 'bitcoin-cash';
    requiresAlchemy?: boolean;
}

export interface IWalletAdapter {
  fetchBalances(ownerAddress: string, assets: Omit<AssetRow, 'balance'>[]): Promise<AssetRow[]>;
  checkAccountSecurity?(address: string): Promise<any>;
}

export interface SessionNode {
  id: string;
  profile: UserProfile;
  lastActive: number;
  session?: {
    access_token: string;
    refresh_token: string;
  };
}

export interface UserProfile {
    id: string; // UUID matching auth.users
    name: string; // Username Column
    photo_url?: string;
    wnc_earnings: number;
    wnc_referral_escrow: number; // Institutional Escrow Field
    tokens: number;
    plan_type: string; // 'Free', 'Premium Elite', 'Global CEO'
    premium_expires_at?: string; // TIMESTAMPTZ
    account_number?: string; 
    referral_code?: string; // New clean referral code
    vault_phrase?: string;
    iv?: string;
    vault_infura_key?: string;
    infura_iv?: string;
    vault_alchemy_key?: string;
    alchemy_iv?: string;
    evm_address?: string;
    xrp_address?: string;
    polkadot_address?: string;
    kusama_address?: string;
    near_address?: string;
    btc_address?: string;
    ltc_address?: string;
    doge_address?: string;
    solana_address?: string;
    cosmos_address?: string;
    osmosis_address?: string;
    secret_address?: string;
    injective_address?: string;
    celestia_address?: string;
    cardano_address?: string;
    tron_address?: string;
    algorand_address?: string;
    hedera_address?: string;
    tezos_address?: string;
    aptos_address?: string;
    sui_address?: string;
    starknet_address?: string;
    bep2_address?: string;
    bch_address?: string;
    onboarding_completed?: boolean;
    onesignal_player_id?: string; 
    average_rating?: number;
    review_count?: number;
    tier?: number;
    security_locked?: boolean;
    last_login_device?: string;
    is_disabled?: boolean;
    protection_pin_hash?: string;
    is_blocked?: boolean;
    block_reason?: string;
    passkey_hash?: string;
    kyc_status?: 'not_started' | 'pending' | 'verified' | 'rejected';
}

export interface MarketplaceAd {
  id: string;
  type: 'buy' | 'sell';
  token: string;
  price: string;
  fee: string;
  network: string;
  user?: string;
}

export interface WhaleActivity {
  id: string;
  user: string;
  message: string;
  timestamp: string;
  type: 'buy' | 'sell' | 'move';
}

export interface NFTItem {
  id: string;
  contractAddress: string;
  tokenId: string;
  name: string;
  description: string;
  imageUrl: string;
  collectionName: string;
  chainId: number;
  type?: 'ERC721' | 'ERC1155';
  owner?: string;
  price?: number;
  bestOffer?: number;
}

export interface YieldPool {
  id: string;
  symbol: string;
  project: string;
  apy: number;
  tvlUsd: number;
  chain: string;
  risk?: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DeFiPosition {
  id: string;
  protocol: string;
  asset: string;
  balance: number;
  valueUsd: number;
  apy: number;
}

export interface PaymentRequest {
    id: string;
    requester_id: string;
    requester_account_number: string;
    chain_type: string;
    token_symbol: string;
    token_address?: string;
    amount: number;
    note?: string;
    status: string;
    created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  from_user_id?: string;
  transaction_id?: string;
  type: string;
  transaction_type?: string;
  sender_name?: string;
  receiver_name?: string;
  bank_name?: string;
  request_id?: string;
  amount?: number;
  token?: string;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  title: string;
  message: string;
  metadata?: any;
}

export interface Review {
  id: string;
  trade_id: string;
  reviewer_id: string;
  subject_id: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface StorageFile {
  id: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  bucket: string;
  used_in: string;
  is_used: boolean;
  url: string;
  created_at: string;
}

export interface EscrowListing {
  id: string;
  seller_id: string;
  type: string;
  asset?: string;
  amount?: number;
  price_wnc: number;
  description: string;
  status: string;
  created_at: string;
  seller?: {
    name: string;
    photo_url: string;
    average_rating?: number;
    review_count?: number;
    tier?: number;
  };
}

export interface EscrowRequest {
  id: string;
  listing_id: string | null;
  requester_id: string;
  receiver_id: string;
  amount: number;
  description: string;
  status: string;
  created_at: string;
  // Joins for UI
  requester?: {
    name: string;
    photo_url: string;
  };
  receiver?: {
    name: string;
    photo_url: string;
  };
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referral_code_used: string;
  status: 'pending' | 'completed';
  total_transfers: number;
  reward_amount: number;
  created_at: string;
  updated_at: string;
  referred?: {
    name: string;
    email: string;
    photo_url: string;
  };
}

export interface UnifiedTransaction {
  id: string;
  hash: string;
  from: string;
  to: string;
  amount: number;
  symbol?: string;
  tokenAddress?: string;
  chainId: number;
  timestamp: string;
  status: 'pending' | 'completed' | 'failed';
  isOut: boolean;
  type: string; // 'transfer', 'swap', 'approve', 'receive', 'fee'
  fee?: number;
  explorerUrl?: string;
}

export interface Dispute {
  id: string;
  status: string;
  createdAt: string;
  admin_notes?: string;
  resolved_by_admin: boolean;
  payment_status?: string;
  code_submission_status?: string;
  payment_proof_url?: string;
  code_proof_url?: string;
  buyer: {
    id: string;
    name: string;
    photoUrl: string;
  };
  seller: {
    id: string;
    name: string;
    photoUrl: string;
  };
  trade: {
    type: string;
    amount: number;
    currency: string;
    price: number;
    price_currency: string;
    code?: string;
  };
  chatHistory: {
    sender: 'buyer' | 'seller' | 'admin';
    message: string;
    timestamp: string;
  }[];
}