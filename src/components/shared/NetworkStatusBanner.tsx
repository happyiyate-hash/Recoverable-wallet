'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Wifi, WifiOff, Server, X, Activity, ZapOff } from 'lucide-react';
import { useConnectivity, ConnectionStatus } from '@/contexts/connectivity-provider';
import { useWallet } from '@/contexts/wallet-provider';
import { cn } from '@/lib/utils';

/**
 * INSTITUTIONAL SYSTEM ALERT SENTINEL
 * Version: 4.0.0 (Temporary Matte Standard)
 * 
 * Rules:
 * 1. NO BLOCKING: Banner is slim and non-intrusive.
 * 2. TEMPORARY: Auto-dismisses after 5s.
 * 3. CONTEXT-AWARE: Uses unique icons for Internet vs Backend.
 */

type AlertType = 'INTERNET' | 'BACKEND' | null;

export function NetworkStatusBanner() {
  const { internetStatus } = useConnectivity();
  const { realtimeStatus } = useWallet();
  const [isVisible, setIsVisible] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>('ONLINE');
  
  const prevInternetRef = useRef<string>(internetStatus);
  const prevRealtimeRef = useRef<string>(realtimeStatus);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 1. Silent Initial State
    if (prevInternetRef.current === internetStatus && prevRealtimeRef.current === realtimeStatus) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const isActuallyOnline = internetStatus === 'ONLINE' && realtimeStatus !== 'DISCONNECTED';
    const wasPreviouslyOffline = prevInternetRef.current === 'OFFLINE' || prevRealtimeRef.current === 'DISCONNECTED';

    if (isActuallyOnline) {
      if (wasPreviouslyOffline && internetStatus === 'ONLINE' && realtimeStatus === 'CONNECTED') {
        // BACK ONLINE: Temporary success banner
        setStatus('ONLINE');
        setIsVisible(true);
        timeoutRef.current = setTimeout(() => setIsVisible(false), 3000);
      } else if (internetStatus === 'ONLINE' && (realtimeStatus === 'CONNECTED' || realtimeStatus === 'SYNCING')) {
        // CONNECTED or SYNCING: Silent
        setIsVisible(false);
      }
    } else {
      // OFFLINE: Temporary banner (stays until back online or dismissed)
      if (internetStatus === 'OFFLINE' || realtimeStatus === 'DISCONNECTED') {
          setStatus('OFFLINE');
          setIsVisible(true);
      }
    }

    prevInternetRef.current = internetStatus;
    prevRealtimeRef.current = realtimeStatus;
  }, [internetStatus, realtimeStatus]);

  const isOnline = status === 'ONLINE';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0, x: '-50%' }}
          animate={{ y: 0, opacity: 1, x: '-50%' }}
          exit={{ y: -100, opacity: 0, x: '-50%' }}
          className="fixed top-6 z-[2000] w-[90%] max-w-[340px] pointer-events-auto left-1/2"
        >
          <div className={cn(
            "flex items-center gap-3 px-5 py-3 rounded-[2rem] border backdrop-blur-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-colors duration-500",
            isOnline ? "bg-green-500/10 border-green-500/20" : "bg-red-500/10 border-red-500/20"
          )}>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg bg-black/40",
              isOnline ? "text-green-500" : "text-red-500"
            )}>
              {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            </div>
            
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-white leading-tight">
                {isOnline ? 'System Back Online' : 'Network Disconnected'}
              </p>
              <p className="text-[7px] font-bold uppercase tracking-[0.2em] text-white/30 mt-0.5">
                {isOnline ? 'Real-time sync restored' : 'Institutional node in local mode'}
              </p>
            </div>

            {isOnline && (
                <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
