'use client';

import { supabase } from '@/lib/supabase/client';

/**
 * INSTITUTIONAL NAIRA SETTLEMENT SERVICE
 * Version: 4.0.0 (Production Node Standard)
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export interface BankNode {
  name: string;
  code: string;
}

export const nairaService = {
  /**
   * Fetches the searchable registry of supported Nigerian banks.
   */
  async fetchBanks(): Promise<BankNode[]> {
    try {
      const res = await fetch(`${BACKEND_URL}/flw/banks/NG`);
      if (!res.ok) throw new Error("Bank registry unreachable.");
      const data = await res.json();
      return data.data || [];
    } catch (e) {
      // High-fidelity fallback for terminal stability
      return [
        { name: 'Access Bank', code: '044' },
        { name: 'GTBank', code: '058' },
        { name: 'Zenith Bank', code: '057' },
        { name: 'UBA', code: '033' },
        { name: 'First Bank of Nigeria', code: '011' },
        { name: 'Kuda Bank', code: '090267' },
        { name: 'Wema Bank', code: '035' },
        { name: 'Moniepoint', code: '50515' },
        { name: 'Opay', code: '999992' },
        { name: 'Palmpay', code: '999991' },
        { name: 'Fidelity Bank', code: '070' },
        { name: 'Stanbic IBTC', code: '221' },
        { name: 'Sterling Bank', code: '232' },
        { name: 'Union Bank', code: '032' }
      ];
    }
  },

  /**
   * Provisions a virtual bank account for the user identity.
   */
  async provisionVirtualAccount(userId: string) {
    try {
      const res = await fetch(`${BACKEND_URL}/flw/create-account/${userId}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error("Account provisioning failed.");
      return await res.json();
    } catch (e) {
      console.error("[NAIRA_SERVICE_FAIL]", e);
      return null;
    }
  },

  /**
   * Resolves a bank account number to a legal identity node via Flutterwave.
   */
  async resolveAccount(accountNumber: string, bankCode: string) {
    try {
      const res = await fetch(`${BACKEND_URL}/flw/resolve-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_number: accountNumber, account_bank: bankCode })
      });
      if (!res.ok) throw new Error("Resolution failed.");
      const data = await res.json();
      return data.data; // { account_name: "..." }
    } catch (e) {
      return null;
    }
  },

  /**
   * Initiates an institutional withdrawal handshake.
   */
  async withdraw(userId: string, amount: number, accountNumber: string, bankCode: string) {
    const res = await fetch(`${BACKEND_URL}/withdraw/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        amount,
        account_number: accountNumber,
        bank_code: bankCode
      })
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Withdrawal node rejected.");
    }
    
    return await res.json();
  }
};
