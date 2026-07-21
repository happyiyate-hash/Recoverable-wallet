
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';

/**
 * GLOBAL ERROR LISTENER
 * Consumes the 'app-error' channel to trigger high-fidelity toasts.
 */
export function GlobalErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleAppError = (payload: { message: string; context?: string }) => {
      toast({
        variant: 'destructive',
        title: payload.context || 'System Advisory',
        description: payload.message,
      });
    };

    errorEmitter.on('app-error', handleAppError);
    return () => errorEmitter.off('app-error', handleAppError);
  }, [toast]);

  return null;
}
