
'use client';

import { errorEmitter } from '@/firebase/error-emitter';

/**
 * INSTITUTIONAL ERROR PROTOCOL
 * Version: 1.0.0
 */

export const isProduction = process.env.NODE_ENV === 'production';
export const isWorkspace = process.env.NODE_ENV !== 'production';

/**
 * Resolves errors based on the environment and broadcasts to the global listener.
 * @param error The caught exception
 * @param context Optional description of where the error occurred
 */
export function handleError(error: unknown, context?: string): string {
  // Always log full telemetry for developers
  console.error(`[REGISTRY_EXCEPT_NODE] ${context || 'General'}:`, error);

  let message = 'Handshake interrupted. Please try again.';

  if (isWorkspace) {
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === 'object' && error !== null && 'message' in error) {
      message = (error as any).message;
    } else {
      message = String(error);
    }
  }

  // Broadcast to global toast listener
  errorEmitter.emit('app-error', { 
    message, 
    context: context || 'System Advisory', 
    originalError: error 
  });

  return message;
}

/**
 * Async wrapper for standardized error handling in data nodes.
 */
export async function safeAsync<T>(
  promise: Promise<T>,
  context?: string
): Promise<[T | null, string | null]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (err) {
    const message = handleError(err, context);
    return [null, message];
  }
}
