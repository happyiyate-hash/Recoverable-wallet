'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';

/**
 * INSTITUTIONAL CONNECTIVITY ORCHESTRATOR
 * Version: 4.0.0 (Dual-Layer Handshake)
 * 
 * Tracks:
 * 1. INTERNET: navigator.onLine (Physical network layer)
 * 2. BACKEND: WebSocket / RPC Availability (Logic layer)
 */

export type ConnectionStatus = 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'UNAVAILABLE';

interface ConnectivityContextType {
  internetStatus: ConnectionStatus;
  backendStatus: ConnectionStatus;
  isOnline: boolean;
  isBackendConnected: boolean;
  lastSync: number | null;
}

const ConnectivityContext = createContext<ConnectivityContextType | undefined>(undefined);

export function ConnectivityProvider({ children }: { children: React.ReactNode }) {
  const [internetStatus, setInternetStatus] = useState<ConnectionStatus>('ONLINE');
  const [backendStatus, setBackendStatus] = useState<ConnectionStatus>('ONLINE');
  const [lastSync, setLastSync] = useState<number | null>(null);

  // 🛡️ LAYER 1: ISP SENTINEL
  useEffect(() => {
    const updateInternet = () => {
      setInternetStatus(navigator.onLine ? 'ONLINE' : 'OFFLINE');
    };
    window.addEventListener('online', updateInternet);
    window.addEventListener('offline', updateInternet);
    updateInternet();
    return () => {
      window.removeEventListener('online', updateInternet);
      window.removeEventListener('offline', updateInternet);
    };
  }, []);

  // 🛡️ LAYER 2: BACKEND NODE PULSE
  const checkBackend = useCallback(async () => {
    if (internetStatus === 'OFFLINE') {
      setBackendStatus('UNAVAILABLE');
      return;
    }

    const start = Date.now();
    try {
      // Use a light-weight health probe
      const res = await fetch('/api/admin/dashboard-stats', { method: 'HEAD', cache: 'no-store' });
      const latency = Date.now() - start;

      if (res.ok) {
        setLastSync(Date.now());
        setBackendStatus(latency > 2500 ? 'DEGRADED' : 'ONLINE');
      } else {
        setBackendStatus('UNAVAILABLE');
      }
    } catch (e) {
      setBackendStatus('UNAVAILABLE');
    }
  }, [internetStatus]);

  useEffect(() => {
    checkBackend();
    const interval = setInterval(checkBackend, 15000);
    return () => clearInterval(interval);
  }, [checkBackend]);

  const value = useMemo(() => ({
    internetStatus,
    backendStatus,
    isOnline: internetStatus === 'ONLINE',
    isBackendConnected: backendStatus === 'ONLINE' || backendStatus === 'DEGRADED',
    lastSync
  }), [internetStatus, backendStatus, lastSync]);

  return (
    <ConnectivityContext.Provider value={value}>
      {children}
    </ConnectivityContext.Provider>
  );
}

export function useConnectivity() {
  const context = useContext(ConnectivityContext);
  if (context === undefined) {
    throw new Error('useConnectivity must be used within a ConnectivityProvider');
  }
  return context;
}
