'use client';

import { useEffect, useRef, useState } from 'react';
import { systemEmitter } from '@/lib/events/systemEmitter';

export function useRealtimeGateway(walletAddress?: string | null) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const backoffTimeouts = [1000, 2000, 5000, 10000, 20000]; // 1s, 2s, 5s, 10s, 20s
  
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pongTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;

    const connect = () => {
      if (!walletAddress) {
        cleanup();
        return;
      }

      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';
      const socket = new WebSocket(`${wsUrl}/${walletAddress.toLowerCase()}`);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log(`[WS] Connected to Watchtower for ${walletAddress}`);
        setIsConnected(true);
        reconnectAttempts.current = 0; // Reset attempts on successful connect

        // Register Device
        socket.send(JSON.stringify({
          type: "DEVICE_INFO",
          payload: {
             device_id: typeof window !== 'undefined' ? localStorage.getItem('device_id') || 'unknown' : 'unknown',
             platform: "web", // or Capacitor info if available
             push_token: "placeholder"
          }
        }));

        // Start Heartbeat
        pingIntervalRef.current = setInterval(() => {
           if (socket.readyState === WebSocket.OPEN) {
             socket.send(JSON.stringify({ type: "PING" }));
             
             // Expect PONG within 5 seconds
             pongTimeoutRef.current = setTimeout(() => {
                console.warn("[WS] Heartbeat timeout. Reconnecting...");
                socket.close();
             }, 5000);
           }
        }, 20000);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type, payload } = data;
          
          if (type === "PONG") {
             if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
             return;
          }

          // Dispatch to Global Event Bus
          systemEmitter.emit(type, payload);
        } catch (err) {
          console.warn("[WS] Failed to parse message:", err);
        }
      };

      socket.onclose = () => {
        console.log(`[WS] Disconnected from Watchtower for ${walletAddress}`);
        setIsConnected(false);
        cleanupHeartbeat();
        
        // Exponential Backoff Reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
           const timeout = backoffTimeouts[reconnectAttempts.current];
           console.log(`[WS] Reconnecting in ${timeout}ms... (Attempt ${reconnectAttempts.current + 1})`);
           reconnectTimer = setTimeout(connect, timeout);
           reconnectAttempts.current++;
        }
      };

      socket.onerror = (error) => {
        console.error("[WS] Connection Error");
        socket.close(); // Force close to trigger reconnect logic
      };
    };

    const cleanupHeartbeat = () => {
       if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
       if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
    };

    const cleanup = () => {
       cleanupHeartbeat();
       if (reconnectTimer) clearTimeout(reconnectTimer);
       if (wsRef.current) {
         // Prevent onclose from triggering reconnect during unmount
         wsRef.current.onclose = null;
         wsRef.current.close();
         wsRef.current = null;
       }
       setIsConnected(false);
    };

    connect();

    return cleanup;
  }, [walletAddress]);

  return { isConnected };
}
