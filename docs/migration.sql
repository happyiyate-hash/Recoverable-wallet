
-- 1. Create the Flexible Wallets Registry
CREATE TABLE IF NOT EXISTS public.wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    blockchain_id TEXT NOT NULL, -- 'evm', 'xrp', 'near', 'polkadot', etc.
    address TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, blockchain_id)
);

-- 2. Enable Row Level Security
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

-- 3. Security Policies
CREATE POLICY "Users can manage their own wallets" ON public.wallets
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public can read wallets for lookup" ON public.wallets
    FOR SELECT USING (true);

-- 4. ATOMIC SYNC FUNCTION (Accepts Unlimited Blockchains)
CREATE OR REPLACE FUNCTION public.sync_user_wallets(
    p_user_id UUID,
    p_wallets JSONB -- e.g. [{"type": "evm", "address": "0x..."}, {"type": "near", "address": "..."}]
) RETURNS VOID AS $$
BEGIN
    -- Insert or update each wallet entry dynamically
    INSERT INTO public.wallets (user_id, blockchain_id, address, updated_at)
    SELECT p_user_id, (w->>'type'), (w->>'address'), now()
    FROM jsonb_array_elements(p_wallets) AS w
    ON CONFLICT (user_id, blockchain_id)
    DO UPDATE SET 
        address = EXCLUDED.address,
        updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
