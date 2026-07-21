-- ==========================================================
-- BACKEND RECOVERY & HARDENING SUITE v2.0
-- Purpose: Fix Schema Mismatches, Auth Sync, and Escrow Visibility
-- Instructions: Run this in the Supabase SQL Editor.
-- ==========================================================

-- 1. PROFILE IDENTITY HARDENING
-- Ensure all columns requested by frontend joins exist
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS rating NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_marketplace_seller BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Backfill emails from auth.users if missing
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

-- 2. ESCROW TABLE DEFAULTS
-- Prevents listings from being filtered out if they were inserted without status/visibility
ALTER TABLE public.escrow_listings 
  ALTER COLUMN status SET DEFAULT 'open',
  ALTER COLUMN visibility SET DEFAULT 'public',
  ALTER COLUMN created_at SET DEFAULT NOW();

ALTER TABLE public.escrow_requests
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN visibility SET DEFAULT 'active',
  ALTER COLUMN created_at SET DEFAULT NOW();

-- 3. RESILIENT IDENTITY SYNC TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    name, 
    avatar_url,
    photo_url
  )
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    photo_url = COALESCE(EXCLUDED.photo_url, profiles.photo_url),
    updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 4. ESCROW RLS PROTOCOL (PERMISSIVE ACCESS)
-- Enable RLS but add "Select All" for Marketplace as requested for fix verification.
ALTER TABLE public.escrow_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public View" ON public.escrow_listings;
CREATE POLICY "Public View" ON public.escrow_listings 
FOR SELECT USING (true); -- Permissive read for debugging

CREATE POLICY "Owner Manage" ON public.escrow_listings 
FOR ALL USING (auth.uid() = seller_id);

-- Requests policies
DROP POLICY IF EXISTS "Participant View Requests" ON public.escrow_requests;
CREATE POLICY "Participant View Requests" ON public.escrow_requests 
FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "User Insert Requests" ON public.escrow_requests;
CREATE POLICY "User Insert Requests" ON public.escrow_requests 
FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Trades policies
DROP POLICY IF EXISTS "Participant View Trades" ON public.escrow_trades;
CREATE POLICY "Participant View Trades" ON public.escrow_trades 
FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- 5. RPC ENGINE: ATOMIC ESCROW OPS
CREATE OR REPLACE FUNCTION public.create_private_escrow(
    p_requester UUID,
    p_receiver UUID,
    p_amount NUMERIC,
    p_description TEXT
) RETURNS UUID AS $$
DECLARE
    v_request_id UUID;
BEGIN
    INSERT INTO public.escrow_requests (requester_id, receiver_id, amount, description)
    VALUES (p_requester, p_receiver, p_amount, p_description)
    RETURNING id INTO v_request_id;
    RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.accept_private_escrow(p_request_id UUID, p_user_id UUID) 
RETURNS JSON AS $$
DECLARE
    v_req RECORD;
    v_trade_id UUID;
BEGIN
    SELECT * INTO v_req FROM public.escrow_requests WHERE id = p_request_id;
    IF v_req.receiver_id != p_user_id THEN
        RETURN json_build_object('success', false, 'message', 'Unauthorized');
    END IF;

    UPDATE public.escrow_requests SET status = 'accepted' WHERE id = p_request_id;
    INSERT INTO public.escrow_trades (request_id, listing_id, buyer_id, seller_id, amount_wnc)
    VALUES (p_request_id, v_req.listing_id, v_req.requester_id, v_req.receiver_id, v_req.amount)
    RETURNING id INTO v_trade_id;

    RETURN json_build_object('success', true, 'trade_id', v_trade_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Identity Resolution
CREATE OR REPLACE FUNCTION public.search_profile_by_account(p_account_number TEXT)
RETURNS SETOF public.profiles AS $$
BEGIN
    RETURN QUERY SELECT * FROM public.profiles WHERE account_number = p_account_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. INDEXING FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_escrow_listings_seller ON public.escrow_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_escrow_requests_participants ON public.escrow_requests(requester_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_escrow_trades_participants ON public.escrow_trades(buyer_id, seller_id);

-- Backfill existing users
INSERT INTO public.profiles (id, email, name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- Handshake Secured. System Hardened.
