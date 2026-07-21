'use client';

import { supabase } from '@/lib/supabase/client';
import type { Notification } from '@/lib/types';

/**
 * INSTITUTIONAL NOTIFICATION SERVICE
 * Version: 4.0.0 (Production is_read Standard)
 */

const CACHE_KEY_PREFIX = 'ss-notifications-cache-';

export interface SendNotificationParams {
  userId: string;
  type: 'swap' | 'receive' | 'send' | 'system' | string;
  transaction_type?: 'credit' | 'debit' | 'request_approved' | 'request_paid' | string;
  sender_name?: string;
  receiver_name?: string;
  bank_name?: string;
  request_id?: string;
  title: string;
  message: string;
  amount?: number;
  token?: string;
  fromUserId?: string;
  transactionId?: string;
  icon_color?: string;
  metadata?: any;
}

export const notificationService = {
  /**
   * Retrieves notifications from local high-speed cache.
   */
  getCached(userId: string): Notification[] {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(`${CACHE_KEY_PREFIX}${userId}`);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  },

  /**
   * Persists a list of notification nodes to the local registry.
   */
  persistToCache(userId: string, notifications: Notification[]) {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(`${CACHE_KEY_PREFIX}${userId}`, JSON.stringify(notifications.slice(0, 50)));
    } catch (e) {}
  },

  /**
   * Fetches latest notifications from the Supabase registry.
   */
  async fetchForUser(userId: string): Promise<Notification[]> {
    if (!supabase) return [];
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          sender:from_user_id (
            name,
            photo_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      
      const results = (data || []) as Notification[];
      this.persistToCache(userId, results);
      return results;
    } catch (e) {
      console.warn('[NOTIFICATION_SERVICE_ADVISORY] Registry sync deferred.');
      return this.getCached(userId);
    }
  },

  /**
   * Dispatches a new notification node to the database registry.
   */
  async send(params: SendNotificationParams) {
    if (!supabase) return null;

    const payload = {
      user_id: params.userId,
      from_user_id: params.fromUserId || null,
      transaction_id: params.transactionId || null,
      type: params.type,
      transaction_type: params.transaction_type || null,
      sender_name: params.sender_name || null,
      receiver_name: params.receiver_name || null,
      bank_name: params.bank_name || null,
      request_id: params.request_id || null,
      amount: params.amount || null,
      token: params.token || null,
      title: params.title,
      message: params.message,
      is_read: false,
      read_at: null,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('notifications')
      .insert([payload])
      .select()
      .single();

    if (error) { 
      console.warn('[NOTIFICATION_SERVICE_ADVISORY] Handshake deferred:', error.message);
      return null;
    }

    return data;
  },

  /**
   * MASTER NOTIFICATION ENGINE (PRO-LEVEL UNIFICATION)
   */
  async createNotification(event: { type: string; title: string; body: string; user_id: string; metadata?: any }) {
    if (!supabase) return null;
    
    const { data, error } = await supabase
      .from('notifications')
      .insert([{
        user_id: event.user_id,
        title: event.title,
        message: event.body,
        type: event.type,
        is_read: false,
        metadata: event.metadata || {},
        created_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (error) {
      console.error('[MASTER_NOTIF_ERROR]', error.message);
      return null;
    }

    return data;
  },

  /**
   * Modular Alert Wrappers
   */
  async creditAlert(params: { recipientId: string; senderId: string; senderName: string; amount: number; bankName: string; token?: string; transactionId?: string }) {
    return this.send({
      userId: params.recipientId,
      fromUserId: params.senderId,
      transactionId: params.transactionId,
      sender_name: params.senderName,
      bank_name: params.bankName,
      amount: params.amount,
      token: params.token || 'WNC',
      type: 'TRANSFER_IN',
      transaction_type: 'credit',
      title: 'Transfer Received',
      message: `You received ${params.amount} ${params.token || 'WNC'} from ${params.senderName} via ${params.bankName}`,
    });
  },

  async loginAlert(userId: string, deviceInfo: string) {
    return this.send({
      userId,
      type: 'SECURITY_ALERT',
      title: 'New Login Detected',
      message: `Login authorized from a new device: ${deviceInfo}. If this wasn't you, lock your vault immediately.`,
    });
  },

  async debitAlert(params: { senderId: string; receiverId: string; receiverName: string; amount: number; bankName: string; token?: string; transactionId?: string }) {
    return this.send({
      userId: params.senderId,
      fromUserId: params.receiverId,
      transactionId: params.transactionId,
      receiver_name: params.receiverName,
      bank_name: params.bankName,
      amount: params.amount,
      token: params.token || 'WNC',
      type: 'TRANSFER_OUT',
      transaction_type: 'debit',
      title: 'Transfer Sent',
      message: `You sent ${params.amount} ${params.token || 'WNC'} to ${params.receiverName} via ${params.bankName}`,
    });
  },

  async requestApprovedAlert(params: { requestId: string; requesterId: string; approverId: string; approverName: string; amount: number; transactionId?: string }) {
    return this.send({
      userId: params.requesterId,
      fromUserId: params.approverId,
      transactionId: params.transactionId,
      sender_name: params.approverName,
      amount: params.amount,
      type: 'REQUEST_APPROVAL',
      transaction_type: 'request_approved',
      request_id: params.requestId,
      title: 'Request Approved',
      message: `${params.approverName} approved your request for ${params.amount} WNC`,
    });
  },

  async requestPaidAlert(params: { payerId: string; payeeId: string; payeeName: string; amount: number; transactionId?: string }) {
    return this.send({
      userId: params.payerId,
      fromUserId: params.payeeId,
      transactionId: params.transactionId,
      receiver_name: params.payeeName,
      amount: params.amount,
      type: 'REQUEST_PAYMENT',
      transaction_type: 'request_paid',
      title: 'Payment Complete',
      message: `Successfully paid ${params.amount} WNC to ${params.payeeName}`,
    });
  },

  /**
   * Purges history.
   */
  async clearAll(userId: string) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${CACHE_KEY_PREFIX}${userId}`);
    }
    if (!supabase) return;
    await supabase.from('notifications').delete().eq('user_id', userId);
  },

  /**
   * Marks nodes as read in database and cache.
   */
  async markAsRead(userId: string, notificationIds: string[]) {
    if (!supabase || notificationIds.length === 0) return;
    
    // Optimistic cache update
    const cached = this.getCached(userId);
    const updated = cached.map(n => notificationIds.includes(n.id) ? { ...n, is_read: true, read_at: new Date().toISOString() } : n);
    this.persistToCache(userId, updated);

    await supabase
      .from('notifications')
      .update({ 
        is_read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('user_id', userId)
      .in('id', notificationIds);
  }
};
