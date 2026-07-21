
/**
 * REDIRECTOR: Complete Profile logic has moved to /settings.
 * This route is now a secondary node to ensure system continuity.
 */
import { redirect } from 'next/navigation';

export default function CompleteProfileRedirect() {
  redirect('/settings');
}
