
'use client';

import { supabase } from '@/lib/supabase/client';

/**
 * INSTITUTIONAL DEVICE FINGERPRINTING SERVICE
 * Version: 2.0.0 (Behavioral Registry Sync)
 * 
 * Orchestrates hardware node identification and database-backed trust registry.
 */

export interface DeviceInfo {
  userAgent: string;
  platform: string;
  language: string;
  screen: string;
  timezone: string;
}

export const deviceSecurityService = {
  /**
   * Generates a high-entropy device fingerprint hash.
   */
  async generateFingerprint(): Promise<string> {
    if (typeof window === 'undefined') return '';

    const deviceInfo: DeviceInfo = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      screen: `${window.screen.width}x${window.screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };

    const rawData = JSON.stringify(deviceInfo);
    const encoder = new TextEncoder();
    const data = encoder.encode(rawData);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  /**
   * Resolves a human-readable alias for the current device node.
   */
  getDeviceName(): string {
    if (typeof window === 'undefined') return 'Unknown Node';
    const ua = navigator.userAgent;
    if (ua.includes('iPhone')) return 'Apple iPhone';
    if (ua.includes('Android')) return 'Android Device';
    if (ua.includes('Windows')) return 'Windows PC';
    if (ua.includes('Macintosh')) return 'Macintosh';
    return 'Desktop Terminal';
  },

  /**
   * Audits the registry to see if the current device hash is trusted.
   */
  async checkDeviceTrust(userId: string): Promise<boolean> {
    if (!supabase || !userId) return false;

    try {
      const fingerprint = await this.generateFingerprint();
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('behavior_profile')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      const trustedDevices = profile?.behavior_profile?.trusted_devices || [];
      return trustedDevices.includes(fingerprint);
    } catch (e) {
      console.warn("[DEVICE_SENTINEL_ADVISORY] Handshake deferred.");
      return false;
    }
  },

  /**
   * Registers the current device node as trusted in the database.
   */
  async trustCurrentDevice(userId: string) {
    if (!supabase || !userId) return;

    try {
      const fingerprint = await this.generateFingerprint();
      
      // 1. Fetch current profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('behavior_profile')
        .eq('id', userId)
        .single();

      const behavior = profile?.behavior_profile || {};
      const currentTrusted = behavior.trusted_devices || [];

      // 2. Add to trusted list if not present
      if (!currentTrusted.includes(fingerprint)) {
        const updatedTrusted = [...currentTrusted, fingerprint];
        
        await supabase
          .from('profiles')
          .update({
            behavior_profile: {
              ...behavior,
              trusted_devices: updatedTrusted
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', userId);
      }

      // 3. Log to historical trusted devices table for admin audit
      await supabase
        .from('trusted_devices')
        .upsert({
          user_id: userId,
          device_hash: fingerprint,
          device_name: this.getDeviceName(),
          last_used: new Date().toISOString()
        }, { onConflict: 'user_id,device_hash' });

      return true;
    } catch (e) {
      console.error("[DEVICE_SENTINEL_FAIL]", e);
      return false;
    }
  }
};
