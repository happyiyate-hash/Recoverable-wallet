
'use client';

import { supabase } from '@/lib/supabase/client';

/**
 * INSTITUTIONAL ADMINISTRATIVE CONTROL SERVICE
 * Version: 1.1.0
 * 
 * Enables real-time identity blockade, registry audits, and global stats discovery.
 */

export const adminService = {
  /**
   * Blocks a user identity instantly across the terminal.
   */
  async blockUser(userId: string, reason: string) {
    if (!supabase) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        is_blocked: true,
        block_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    return true;
  },

  /**
   * Restores a blocked identity node.
   */
  async unblockUser(userId: string) {
    if (!supabase) return;

    const { error } = await supabase
      .from('profiles')
      .update({
        is_blocked: false,
        block_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;
    return true;
  },

  /**
   * Fetches global ecosystem metrics via the get_admin_stats RPC node.
   */
  async fetchAdminStats() {
    if (!supabase) return null;
    try {
      const { data, error } = await supabase.rpc('get_admin_stats');
      if (error) throw error;
      return data;
    } catch (e) {
      console.warn("[ADMIN_STATS_ADVISORY] Handshake deferred.");
      return null;
    }
  }
};
