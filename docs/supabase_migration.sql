
-- ==========================================================
-- WEVINA TERMINAL: INSTITUTIONAL ADDRESS REGISTRY MIGRATION
-- Protocol Version: 3.1.0
-- Purpose: Reset inconsistent address logic and implement 
--          hardened user-driven synchronization.
-- ==========================================================

-- 1. PURGE LEGACY INCONSISTENCY
DROP TABLE IF EXISTS user_addresses;
DROP TABLE IF EXISTS user_wallet_addresses;

-- 2. CREATE HARDENED REGISTRY
CREATE TABLE user_wallet_addresses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    chain TEXT NOT NULL, -- 'evm', 'xrp', 'polkadot'
    address TEXT NOT NULL,
    is_synced BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, chain) -- Ensures one unique address per chain per user
);

-- 3. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE user_wallet_addresses ENABLE ROW LEVEL SECURITY;

-- 4. IMPLEMENT SECURITY POLICIES
-- Policy: Owners have full control over their own address records
CREATE POLICY "Users can manage their own addresses" 
ON user_wallet_addresses 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Addresses are public for P2P identity resolution
-- This allows the lookup engine to find addresses by user_id
CREATE POLICY "Public P2P identity resolution" 
ON user_wallet_addresses 
FOR SELECT 
USING (true);

-- 5. AUTOMATED TIMESTAMP MANAGEMENT
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER set_user_wallet_addresses_updated_at
    BEFORE UPDATE ON user_wallet_addresses
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

-- 6. INDEXING FOR PERFORMANCE
CREATE INDEX idx_user_wallet_addresses_user_id ON user_wallet_addresses(user_id);
CREATE INDEX idx_user_wallet_addresses_chain ON user_wallet_addresses(chain);
