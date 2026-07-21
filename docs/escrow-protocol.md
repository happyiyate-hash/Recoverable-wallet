# Institutional WNC Escrow Protocol: State Machine Standard
**Version:** 11.0.0 (Master WNC Edition)
**Authority:** SmarterSeller / Node Quick Terminal

This document contains the authoritative SQL logic for the WNC Escrow State Machine. Run these functions in your Supabase SQL Editor to enforce the trade lifecycle.

---

## 1. Registry Tables Update
Ensure your `escrow_trades` table supports the mandatory state machine columns.

```sql
ALTER TABLE public.escrow_trades 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS escrow_balance NUMERIC(20, 6) DEFAULT 0,
ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'active';

-- ENFORCE STRICT STATE TRANSITIONS
ALTER TABLE public.escrow_trades
DROP CONSTRAINT IF EXISTS escrow_trades_status_check;

ALTER TABLE public.escrow_trades
ADD CONSTRAINT escrow_trades_status_check
CHECK (status IN ('PENDING', 'FUNDED', 'DELIVERING', 'COMPLETED', 'DISPUTED'));
```

---

## 2. State Machine RPC Nodes (WNC Optimized)

### 2.1 Fund Escrow (The Lock)
Handles the atomic movement of WNC from the Buyer to the Registry Vault.

```sql
CREATE OR REPLACE FUNCTION fund_escrow(
  p_trade_id uuid,
  p_buyer_id uuid
)
RETURNS json AS $$
DECLARE
  v_trade public.escrow_trades;
  v_result json;
BEGIN
  SELECT * INTO v_trade FROM public.escrow_trades WHERE id = p_trade_id;

  -- 1. State Guard
  IF v_trade.status != 'PENDING' THEN
    RETURN json_build_object('success', false, 'message', 'Trade not in PENDING state');
  END IF;

  -- 2. Authority Guard
  IF v_trade.buyer_id != p_buyer_id THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized: Only buyer can fund.');
  END IF;

  -- 3. WNC Settlement Node (Atomic Transfer to System Vault)
  -- This assumes transfer_wnc_universal handles the balance check and actual movement
  SELECT transfer_wnc_universal(
    '00000000-0000-0000-0000-000000000000'::uuid, -- SYSTEM_ESCROW_VAULT
    'system',
    v_trade.amount_wnc::integer,
    'ESCROW_LOCK:' || p_trade_id::text
  ) INTO v_result;

  IF NOT (v_result->>'success')::boolean THEN
    RETURN v_result;
  END IF;

  -- 4. Update Registry State
  UPDATE public.escrow_trades
  SET status = 'FUNDED',
      escrow_balance = v_trade.amount_wnc,
      updated_at = NOW()
  WHERE id = p_trade_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.2 Confirm Delivery (The Handover)
Seller signs the registry to indicate the node has been dispatched.

```sql
CREATE OR REPLACE FUNCTION deliver_escrow(
  p_trade_id uuid,
  p_seller_id uuid
)
RETURNS json AS $$
DECLARE
  v_trade public.escrow_trades;
BEGIN
  SELECT * INTO v_trade FROM public.escrow_trades WHERE id = p_trade_id;

  IF v_trade.status != 'FUNDED' THEN
    RETURN json_build_object('success', false, 'message', 'Node must be FUNDED first');
  END IF;

  IF v_trade.seller_id != p_seller_id THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  UPDATE public.escrow_trades
  SET status = 'DELIVERING',
      updated_at = NOW()
  WHERE id = p_trade_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.3 Approve & Release (The Settlement)
Buyer releases the locked WNC from the Registry Vault to the Seller.

```sql
CREATE OR REPLACE FUNCTION approve_escrow(
  p_trade_id uuid,
  p_buyer_id uuid
)
RETURNS json AS $$
DECLARE
  v_trade public.escrow_trades;
  v_result json;
BEGIN
  SELECT * INTO v_trade FROM public.escrow_trades WHERE id = p_trade_id;

  IF v_trade.status != 'DELIVERING' THEN
    RETURN json_build_object('success', false, 'message', 'Delivery not confirmed via registry.');
  END IF;

  IF v_trade.buyer_id != p_buyer_id THEN
    RETURN json_build_object('success', false, 'message', 'Unauthorized');
  END IF;

  -- 1. DISPATCH WNC FROM VAULT TO SELLER
  SELECT transfer_wnc_universal(
    v_trade.seller_id,
    'user',
    v_trade.amount_wnc::integer,
    'ESCROW_RELEASE:' || p_trade_id::text
  ) INTO v_result;

  IF NOT (v_result->>'success')::boolean THEN
    RETURN v_result;
  END IF;

  -- 2. FINALIZE TRADE NODE
  UPDATE public.escrow_trades
  SET status = 'COMPLETED',
      escrow_balance = 0,
      visibility = 'completed',
      updated_at = NOW()
  WHERE id = p_trade_id;

  -- 3. CLOSE MARKETPLACE LISTING
  UPDATE public.escrow_listings
  SET status = 'closed', visibility = 'closed'
  WHERE id = v_trade.listing_id;

  -- 4. REJECT PENDING REQUESTS
  UPDATE public.escrow_requests
  SET status = 'rejected', visibility = 'hidden'
  WHERE listing_id = v_trade.listing_id AND status = 'pending';

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 2.4 Raise Dispute (The Lockdown)
Freezes the trade node for administrative forensic audit.

```sql
CREATE OR REPLACE FUNCTION raise_dispute(
  p_trade_id uuid,
  p_user_id uuid,
  p_reason text
)
RETURNS json AS $$
DECLARE
  v_trade public.escrow_trades;
BEGIN
  SELECT * INTO v_trade FROM public.escrow_trades WHERE id = p_trade_id;

  IF v_trade.status NOT IN ('FUNDED', 'DELIVERING') THEN
    RETURN json_build_object('success', false, 'message', 'Cannot dispute at this phase.');
  END IF;

  UPDATE public.escrow_trades
  SET status = 'DISPUTED',
      dispute_reason = p_reason,
      updated_at = NOW()
  WHERE id = p_trade_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
