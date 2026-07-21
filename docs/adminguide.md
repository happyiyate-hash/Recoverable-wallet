# Node Quick Terminal: Administrative Bridge Protocol
**Version:** 3.2.0 (Automated Retention Standards)

This document provides the authoritative roadmap for connecting the **Admin Dashboard** to the Node Quick ecosystem and maintaining registry health.

---

## 1. Core Registry Architecture
All administrative actions must interface with the following tables in the `public` schema.

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | Primary user identity & balance | `id`, `name`, `wnc_earnings`, `kyc_status`, `is_blocked`, `account_number`, `country_code` |
| `kyc_profiles` | Identity verification assets | `user_id`, `full_name`, `id_document_url`, `selfie_url`, `status`, `country_code` |
| `support_tickets` | User reports & appeals | `user_id`, `type`, `sub_type`, `message`, `status`, `admin_notes` |
| `admin_transactions` | Audit trail of payouts | `user_id`, `tx_hash`, `amount`, `token_symbol` |

---

## 2. Data Retention Protocols (Auto-Purge)
To maintain high-fidelity performance, the system implements automated server-side purging via `pg_cron`.

### 2.1 Notification Purge
*   **Trigger**: Records older than **2 months (60 days)**.
*   **Execution**: Daily at `00:00 UTC`.
*   **Target**: `public.notifications`.

### 2.2 Escrow Registry Purge
*   **Trigger**: Terminal nodes (COMPLETED, CANCELLED, REJECTED) older than **2 weeks (14 days)**.
*   **Execution**: Daily at `01:00 UTC`.
*   **Target**: `escrow_trades`, `escrow_requests`, `escrow_listings`.

---

## 3. Automated Regional KYC Protocol
For specific regions (e.g., Nigeria - `NG`), the system supports automated verification handshakes via Edge Functions.

### 3.1 Auto-Approval Handshake (SQL)
When a user submits KYC, the dashboard or an Edge Function can perform an atomic check:

```sql
-- Example: Trigger Auto-Approval for Nigerian nodes
UPDATE public.kyc_profiles 
SET status = 'verified', updated_at = NOW() 
WHERE user_id = $1 AND country_code = 'NG';

UPDATE public.profiles 
SET kyc_status = 'verified', tier = 2 
WHERE id = $1;
```

---

## 4. Connecting the "Shell" to Supabase

### 4.1 Standardized Data Fetching
Stop using hardcoded mock data. Use the Supabase Client SDK to query tables directly. **Surface specific error messages** from the `error` object to the UI for better debugging.

```typescript
// Example: Fetching Pending KYC
const { data, error } = await supabase
  .from('kyc_profiles')
  .select('*, profile:profiles(name, photo_url)')
  .eq('status', 'pending')
  .order('created_at', { ascending: true });

if (error) {
  console.error("KYC Fetch Failure:", error.message, error.hint);
  toast.error(`Database Error: ${error.message}`);
}
```

### 4.2 Real-time Dashboard Synchronization
Enable real-time listeners so the dashboard updates instantly when a user submits a KYC or support ticket.

```typescript
const channel = supabase
  .channel('admin-updates')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_tickets' }, (payload) => {
    toast.info("New Support Ticket Received");
    refreshTicketList();
  })
  .subscribe();
```

---

## 5. Storage & Assets
Identity documents and avatars are stored in Supabase Storage.

*   **Avatars**: Bucket `photos`. Access: `profiles.photo_url`.
*   **KYC Docs**: Bucket `documents`. Access: `kyc_profiles.id_document_url`.

**Instruction**: Ensure RLS policies on the `documents` bucket allow `SELECT` access for users with the `admin` role or use the `Service Role Key` in the dashboard.

---

## 6. User Profile Details Page (`/admin/users/[id]`)
When creating the detailed user view, aggregate data from across the registry:

1.  **Identity**: Fetch `name`, `email`, `phone_number`, and `account_number` from `profiles` joined with `auth.users`.
2.  **Ledger**: Fetch `wnc_earnings` from `profiles` and transaction history from `wnc_transfers`.
3.  **Security**: Check `is_blocked` and `kyc_status`.
4.  **Actions**:
    *   **Approve KYC**: Call `rpc('approve_kyc', { p_user_id: userId })`.
    *   **Lock Account**: Call `rpc('set_user_block_status', { p_user_id: userId, p_is_blocked: true, p_reason: 'Reason' })`.

---

## 7. Dispute & Escrow Management
Disputes are tracked in `escrow_trades` where `status = 'DISPUTED'`.

```typescript
// Fetch Active Disputes
const { data } = await supabase
  .from('escrow_trades')
  .select('*, seller:profiles!seller_id(*), buyer:profiles!buyer_id(*)')
  .eq('status', 'DISPUTED');
```

---

## 8. RPC Handshake Directory
Always use these RPC functions to ensure atomic updates and bypass standard RLS restrictions.

*   `get_admin_user_list()`: Returns full user metadata including email.
*   `approve_kyc(p_user_id)`: Finalizes identity verification.
*   `set_user_block_status(p_user_id, p_is_blocked, p_reason)`: Administrative blockade toggle.
*   `get_pending_kyc()`: Returns the current verification queue.

*Handshake Secured. Connectivity Optimized.*
