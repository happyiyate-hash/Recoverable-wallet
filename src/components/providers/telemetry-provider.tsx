'use client';

import React, { useEffect } from 'react';
import { initRpcTelemetry, restoreFetch } from '@/lib/telemetry/rpc-interceptor';

export function TelemetryProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize the global RPC interceptor as soon as this mounts
    // This should be at the very top of the React tree
    initRpcTelemetry();

    return () => {
      // Optional cleanup if we want to restore fetch on unmount
      // restoreFetch();
    };
  }, []);

  return <>{children}</>;
}
