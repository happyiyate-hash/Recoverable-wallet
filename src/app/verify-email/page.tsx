
/**
 * REDIRECTOR: This route has moved to /auth/verify-email
 */
import { redirect } from 'next/navigation';
export default function VerifyEmailRedirect() {
  redirect('/auth/verify-email');
}
