
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { systemEmitter } from '@/lib/events/systemEmitter';
import { Zap, ShieldCheck, X, Activity, Loader2, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * INSTITUTIONAL MATTE TOAST
 * Version: 1.0.0
 * 
 * Rules:
 * 1. MATTE FOUNDATION: Dark charcoal with absolute border.
 * 2. TOP SLIDE: High-end animation from the screen ceiling.
 */
export default function RealtimeToast() {
  const [alert, setAlert] = useState<any>(null);

  useEffect(() => {
    const handleTxEvent = (eventType: string, payload: any) => {
       const alertMap: Record<string, any> = {
         'TX_PENDING': { title: 'Transaction Pending', message: `Broadcasting ${payload.amount} ${payload.token}`, type: 'PENDING' },
         'TX_CONFIRMING': { title: 'Confirming...', message: `${payload.confirmations} confirmations.`, type: 'PENDING' },
         'TX_CONFIRMED': { title: 'Transaction Confirmed', message: 'Successfully recorded.', type: 'SUCCESS' },
         'TX_FAILED': { title: 'Transaction Failed', message: payload.reason || 'Reverted by network.', type: 'ERROR' },
         'TX_REPLACED': { title: 'Transaction Replaced', message: 'Sped up or cancelled.', type: 'INFO' },
         'SECURITY_ALERT': { title: 'Security Warning', message: payload.message, type: 'CRITICAL' },
         'SWAP_PENDING': { title: 'Swap Pending', message: 'Executing route...', type: 'PENDING' }
       };

       const mapped = alertMap[eventType];
       if (mapped) {
          setAlert(mapped);
          setTimeout(() => setAlert(null), 7000);
       }
    };

    const handleNotification = (payload: any) => {
      // Map the generic notification payload to the toast format
      setAlert({
        title: payload.title || 'Notification',
        message: payload.body || payload.message || '',
        type: payload.type || (payload.severity === 'success' ? 'SUCCESS' : 'INFO')
      });
      // Auto-expire after 5 seconds
      setTimeout(() => setAlert(null), 5000);
    };

    systemEmitter.on('NOTIFICATION', handleNotification);
    systemEmitter.on('TX_PENDING', (p) => handleTxEvent('TX_PENDING', p));
    systemEmitter.on('TX_CONFIRMING', (p) => handleTxEvent('TX_CONFIRMING', p));
    systemEmitter.on('TX_CONFIRMED', (p) => handleTxEvent('TX_CONFIRMED', p));
    systemEmitter.on('TX_FAILED', (p) => handleTxEvent('TX_FAILED', p));
    systemEmitter.on('TX_REPLACED', (p) => handleTxEvent('TX_REPLACED', p));
    systemEmitter.on('SECURITY_ALERT', (p) => handleTxEvent('SECURITY_ALERT', p));
    systemEmitter.on('SWAP_PENDING', (p) => handleTxEvent('SWAP_PENDING', p));

    return () => {
      systemEmitter.off('NOTIFICATION', handleNotification);
      systemEmitter.off('TX_PENDING', (p) => handleTxEvent('TX_PENDING', p));
      systemEmitter.off('TX_CONFIRMING', (p) => handleTxEvent('TX_CONFIRMING', p));
      systemEmitter.off('TX_CONFIRMED', (p) => handleTxEvent('TX_CONFIRMED', p));
      systemEmitter.off('TX_FAILED', (p) => handleTxEvent('TX_FAILED', p));
      systemEmitter.off('TX_REPLACED', (p) => handleTxEvent('TX_REPLACED', p));
      systemEmitter.off('SECURITY_ALERT', (p) => handleTxEvent('SECURITY_ALERT', p));
      systemEmitter.off('SWAP_PENDING', (p) => handleTxEvent('SWAP_PENDING', p));
    };
  }, []);

  return (
    <AnimatePresence>
      {alert && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-6 left-4 right-4 z-[999] max-w-sm mx-auto pointer-events-none"
        >
          <div className={cn(
            "bg-[#0a0a0c]/95 backdrop-blur-2xl border-l-4 p-4 rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] pointer-events-auto flex items-center justify-between gap-4",
            alert.type === 'PENDING' ? "border-primary" : 
            alert.type === 'CRITICAL' || alert.type === 'ERROR' ? "border-red-500" :
            "border-green-500"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shadow-inner",
                alert.type === 'PENDING' ? "bg-primary/10 text-primary" : 
                alert.type === 'SUCCESS' ? "bg-green-500/10 text-green-500" :
                alert.type === 'CRITICAL' || alert.type === 'ERROR' ? "bg-red-500/10 text-red-500" :
                "bg-white/10 text-white/50"
              )}>
                {alert.type === 'PENDING' ? <Loader2 className="w-5 h-5 animate-spin" /> : 
                 alert.type === 'SUCCESS' ? <ShieldCheck className="w-5 h-5" /> :
                 alert.type === 'CRITICAL' || alert.type === 'ERROR' ? <X className="w-5 h-5" /> :
                 <Bell className="w-5 h-5" />}
              </div>
              <div className="space-y-0.5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                    {alert.title}
                </p>
                <p className="text-[11px] font-medium text-white/60 leading-tight">
                    {alert.message}
                </p>
              </div>
            </div>
            <button onClick={() => setAlert(null)} className="p-1 text-white/20 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
