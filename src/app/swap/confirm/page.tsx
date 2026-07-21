'use client';

/**
 * DEPRECATED: Standard confirmation page decommissioned in favor of the Bottom Sheet Handshake.
 */
import { redirect } from 'next/navigation';

export default function ConfirmSwapRedirect() {
  redirect('/swap');
  return null;
}
