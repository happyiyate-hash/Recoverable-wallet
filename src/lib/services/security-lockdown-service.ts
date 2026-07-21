'use client';

import { supabase } from '@/lib/supabase/client';

/**
 * INSTITUTIONAL SECURITY LOCKDOWN SERVICE
 * Version: 3.0.0 (Authoritative PIN Standard)
 */
export const securityLockdownService = {
  /**
   * Creates a high-sensitivity security token for lockdown links.
   */
  async createSecurityToken(userId: string, type: 'email_alert' | 'password_alert') {
    if (!supabase) return null;
    
    const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const { error } = await supabase.from('security_logs').insert({
      user_id: userId,
      action: `TOKEN_GENERATED:${type}`,
      device_info: token,
      created_at: new Date().toISOString()
    });

    if (error) return null;
    return token;
  },

  /**
   * Triggers emergency lockdown for a specific user.
   */
  async lockAccount(userId: string, token: string) {
    if (!supabase) return { success: false };

    try {
      const { data: log } = await supabase
        .from('security_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('device_info', token)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!log) throw new Error("INVALID_SECURITY_TOKEN");

      const { error } = await supabase
        .from('profiles')
        .update({
          security_locked: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;

      await supabase.auth.signOut();

      return { success: true };
    } catch (e: any) {
      console.error("[LOCKDOWN_FAIL]", e.message);
      return { success: false, error: e.message };
    }
  },

  /**
   * Restores account access via atomic state change.
   */
  async restoreAccount(userId: string) {
    if (!supabase) return false;

    const { error } = await supabase
      .from('profiles')
      .update({
        security_locked: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error("[RESTORE_FAIL]", error.message);
      return false;
    }
    
    return true;
  }
};
