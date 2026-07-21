# Node Quick Terminal: Supabase Master Registry Blueprint
**Version:** 15.1.0 (BCH Sync Standard)  
**Authority:** Institutional Compliance Node

This document provides the authoritative SQL structure for the Node Quick Terminal.

---

## 🏗️ 1. Identity & Profile Nodes
Primary tables for managing user sessions, biometric security, and hardware derivation.

### `profiles`
**Purpose:** Primary identity node. Stores balances, security hashes, and encrypted vault nodes.  
**Realtime:** ✅ Enabled (Crucial for balance and security sync).

```sql
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT UNIQUE,
  email TEXT,
  photo_url TEXT,
  account_number TEXT UNIQUE, -- 10-digit institutional ID
  referral_code TEXT UNIQUE,
  wnc_earnings NUMERIC(20, 6) DEFAULT 0,
  wnc_referral_escrow NUMERIC(20, 6) DEFAULT 0,
  
  -- Encrypted Vault Registry
  vault_phrase TEXT, -- AES-256 Encrypted Mnemonic
  iv TEXT, -- Encryption IV
  vault_infura_key TEXT, -- Encrypted Infura Node
  infura_iv TEXT,
  vault_alchemy_key TEXT, -- Encrypted Alchemy Node
  alchemy_iv TEXT,

  -- Hardware Vault Addresses
  evm_address TEXT,
  solana_address TEXT,
  btc_address TEXT,
  ltc_address TEXT,
  doge_address TEXT,
  xrp_address TEXT,
  polkadot_address TEXT,
  kusama_address TEXT,
  near_address TEXT,
  cosmos_address TEXT,
  osmosis_address TEXT,
  secret_address TEXT,
  injective_address TEXT,
  celestia_address TEXT,
  cardano_address TEXT,
  tron_address TEXT,
  algorand_address TEXT,
  hedera_address TEXT,
  tezos_address TEXT,
  aptos_address TEXT,
  sui_address TEXT,
  starknet_address TEXT,
  bep2_address TEXT,
  bch_address TEXT,

  -- Security Registry
  pin_enabled BOOLEAN DEFAULT false,
  pin_hash TEXT,
  mfa_enabled BOOLEAN DEFAULT false,
  security_locked BOOLEAN DEFAULT false,
  is_disabled BOOLEAN DEFAULT false,
  is_blocked BOOLEAN DEFAULT false,
  block_reason TEXT,
  risk_score INTEGER DEFAULT 0,
  behavior_profile JSONB DEFAULT '{}',
  onboarding_completed BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Automation Node: `handle_new_user`
This trigger automates profile creation, Account ID generation, and referral code provisioning on signup.

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, account_number, referral_code)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    '835' || floor(random() * 8999999 + 1000000)::text,
    upper(substring(md5(random()::text) from 1 for 8))
  );
  return new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

---

## 💰 2. Ledger & Transaction Nodes

### `wnc_transfers`
**Purpose:** Immutable record of internal WNC movements.

```sql
CREATE TABLE public.wnc_transfers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id),
  receiver_id UUID REFERENCES public.profiles(id),
  amount_wnc NUMERIC(20, 6) NOT NULL,
  reference TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### RPC: `transfer_wnc_universal`
Handles atomic movement of WNC between users or system nodes with strict balance validation.

### RPC: `deduct_transaction_fee`
Automatically deducts the fixed 50 WNC maintenance fee on every non-WNC transaction.

---

## 🛡️ 3. Row Level Security (RLS)
The terminal enforces a zero-trust model. Users can only read or update their own data nodes.

```sql
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
```

**Master Registry Secured. Database Infrastructure Unified.**
