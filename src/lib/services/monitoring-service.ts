'use client';

import { supabase } from '@/lib/supabase/client';
import { securityIntelligence } from './security-intelligence';

/**
 * INSTITUTIONAL MONITORING & FRAUD SERVICE
 * Version: 4.0.0 (Activity Ledger Integrated)
 */

export type UserAction = 
  | 'LOGIN' 
  | 'LOGIN_FAILED' 
  | 'TRANSFER' 
  | 'TRANSFER_FAILED' 
  | 'SWAP'
  | 'APPROVAL'
  | 'PENDING'
  | 'PIN_VERIFY' 
  | 'PIN_FAILED' 
  | 'MFA_VERIFY' 
  | 'MFA_FAILED' 
  | 'PROFILE_UPDATE' 
  | 'PASSWORD_CHANGED'
  | 'EMAIL_CHANGED'
  | 'VAULT_ACCESS'
  | 'DEVICE_TRUSTED'
  | 'SECURITY_LOCKDOWN'
  | 'SYSTEM_CHECK';

export const monitoringService = {
  /**
   * Logs a user action and triggers real-time risk scoring updates.
   * Version: 2.0.0 (Registry Standard)
   */
  async logActivity(userId: string, action: UserAction, metadata: any = {}) {
    if (!supabase || !userId) return;

    try {
      const ua = typeof window !== 'undefined' ? navigator.userAgent : 'Unknown';
      const platform = typeof window !== 'undefined' ? navigator.platform : 'Unknown';
      const device = `${platform} - ${ua.slice(0, 30)}...`;

      // 1. Log to Institutional Activity Ledger
      // We use action.toUpperCase() for strict indexing
      await supabase.from('user_activity_logs').insert({
        user_id: userId,
        action: action.toUpperCase(),
        device,
        metadata: {
            ...metadata,
            timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString()
      });

      // 2. Risk Scoring Handshake
      let riskDelta = 0;
      switch (action) {
        case 'LOGIN': riskDelta = securityIntelligence.WEIGHTS.NORMAL_LOGIN; break;
        case 'PIN_FAILED': riskDelta = securityIntelligence.WEIGHTS.WRONG_PIN; break;
        case 'TRANSFER': riskDelta = securityIntelligence.WEIGHTS.WITHDRAW_ATTEMPT; break;
        case 'LOGIN_FAILED': riskDelta = 3; break;
        case 'PASSWORD_CHANGED': riskDelta = 0; break; 
      }

      if (riskDelta > 0) {
        await supabase.rpc('update_risk_score', { p_user_id: userId, p_delta: riskDelta });
      }

      // 3. Security Event Monitoring
      if (riskDelta >= 5 || action.includes('FAILED') || action === 'SECURITY_LOCKDOWN') {
        await supabase.from('security_events').insert({
          user_id: userId,
          event_type: action,
          severity: riskDelta >= 7 ? 'HIGH' : 'MEDIUM',
          metadata: { device, ...metadata },
          created_at: new Date().toISOString()
        });
      }

    } catch (e) {
      console.warn("[MONITORING_ADVISORY] Activity log node deferred.");
    }
  },

  /**
   * Detects rapid brute-force or script-based attack patterns.
   */
  async checkRapidAttack(userId: string) {
    const { data: logs } = await supabase!
      .from('user_activity_logs')
      .select('id, created_at, action')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (logs && securityIntelligence.detectAttackPattern(logs)) {
      await this.logActivity(userId, 'SECURITY_LOCKDOWN', { message: 'Brute-force detected. Instant lockdown triggered.' });
      await supabase!.rpc('update_risk_score', { p_user_id: userId, p_delta: 15 });
      await supabase!.from('profiles').update({ security_locked: true }).eq('id', userId);
    }
  }
};
