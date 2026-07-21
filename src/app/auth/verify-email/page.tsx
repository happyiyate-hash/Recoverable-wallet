
/**
 * DEPRECATED: Email verification is now a slide-up panel within the signup page.
 * Redirecting to prevent dead links.
 */
import { redirect } from 'next/navigation';

export default function VerifyEmailPage() {
  redirect('/auth/signup?verify=true');
}
