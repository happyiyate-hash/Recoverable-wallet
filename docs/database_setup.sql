
-- ==========================================
-- INSTITUTIONAL REGISTRY SQL SUITE v3.2
-- Implementation: Supabase / PostgreSQL
-- ==========================================

-- 1. REFERRALS REGISTRY TABLE
-- Anchors growth events to the permanent database.
CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID REFERENCES auth.users(id) NOT NULL,
    referred_id UUID REFERENCES auth.users(id) UNIQUE NOT NULL, -- Prevents duplicate handshakes
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'credited')),
    reward_amount INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. WITHDRAWAL PROTOCOL (PENDING -> CREDITED)
-- Logic: When growth escrow reaches 1,000 WNC, authorize settlement to main vault.
CREATE OR REPLACE FUNCTION withdraw_referral_bonus(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_pending_total INTEGER;
    v_min_threshold INTEGER := 1000; -- 1,000 WNC Minimum
BEGIN
    -- Determine total growth escrow for this node
    SELECT COALESCE(SUM(reward_amount), 0)
    INTO v_pending_total
    FROM referrals
    WHERE referrer_id = p_user_id AND status = 'pending';

    -- Verify threshold integrity
    IF v_pending_total < v_min_threshold THEN
        RETURN json_build_object(
            'success', false, 
            'message', 'Threshold not met. Node requires ' || v_min_threshold || ' WNC for settlement.'
        );
    END IF;

    -- Atomic Transition: Resolve nodes to credited status
    UPDATE referrals
    SET status = 'credited'
    WHERE referrer_id = p_user_id AND status = 'pending';

    -- Update Public Registry Earnings
    UPDATE profiles
    SET wnc_earnings = wnc_earnings + v_pending_total
    WHERE id = p_user_id;

    -- Generate Registry Log (Transaction)
    INSERT INTO transactions (user_id, type, amount, status, timestamp)
    VALUES (p_user_id, 'referral_reward', v_pending_total, 'completed', NOW());

    RETURN json_build_object('success', true, 'amount', v_pending_total);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. UNIVERSAL P2P SETTLEMENT (WNC TRANSFER)
-- Atomic transfer of internal credits between identity nodes.
CREATE OR REPLACE FUNCTION transfer_wnc_universal(
    p_receiver_id UUID,
    p_destination_type TEXT,
    p_amount INTEGER,
    p_reference TEXT
) RETURNS JSON AS $$
DECLARE
    v_sender_id UUID := auth.uid();
    v_sender_balance INTEGER;
    v_fee INTEGER := 50; -- Mandatory Registry Protocol Fee
    v_total_debit INTEGER;
BEGIN
    -- Identity Check
    SELECT wnc_earnings INTO v_sender_balance FROM profiles WHERE id = v_sender_id;
    
    v_total_debit := p_amount + v_fee;

    -- Solvency Check
    IF v_sender_balance < v_total_debit THEN
        RETURN json_build_object('success', false, 'message', 'Insufficient funds in main vault.');
    END IF;

    -- Atomic Settlement Sequence
    UPDATE profiles SET wnc_earnings = wnc_earnings - v_total_debit WHERE id = v_sender_id;
    UPDATE profiles SET wnc_earnings = wnc_earnings + p_amount WHERE id = p_receiver_id;

    -- Log Registry Handshake
    INSERT INTO transactions (user_id, type, amount, status, timestamp, peer_id)
    VALUES (v_sender_id, 'transfer_out', p_amount, 'completed', NOW(), p_receiver_id);

    INSERT INTO transactions (user_id, type, amount, status, timestamp, peer_id)
    VALUES (p_receiver_id, 'transfer_in', p_amount, 'completed', NOW(), v_sender_id);

    RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
