
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * INSTITUTIONAL AUTH CALLBACK HANDLER
 * Version: 5.0.0 (Loop Resolution Standard)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=NoCode`);
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  // 🔐 Exchange OAuth code for session tokens
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[AUTH_CALLBACK_FAIL]", error.message);
    return NextResponse.redirect(
      `${origin}/auth/login?error=AuthFailed`
    );
  }

  // 👤 Resolve Identity Node
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=NoUser`
    );
  }

  // 🧠 AUDIT: Does the identity have a profile node?
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, name, onboarding_completed')
    .eq('id', user.id)
    .single();

  /**
   * LOOP RESOLUTION LOGIC
   * 1. If profile is new or name is missing -> Go to Vault Establishment (/wallet-session)
   * 2. If profile is active -> Go to Dashboard (/)
   */
  if (!profile || !profile.name || !profile.onboarding_completed) {
    // 🆕 New user or incomplete handshake -> Established Vault required
    return NextResponse.redirect(`${origin}/wallet-session`);
  }

  // ✅ Verified user -> Authorized Terminal Access
  return NextResponse.redirect(`${origin}/`);
}
