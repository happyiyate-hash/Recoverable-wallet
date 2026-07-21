import { redirect } from 'next/navigation';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * INSTITUTIONAL PROTECTED LAYOUT
 * Version: 4.0.0 (Production Migration Standard)
 * 
 * Performs a server-side identity audit before allowing access to dashboard nodes.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    'https://xcjididoxzpymqwodouk.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjamlkaWRveHpweW1xd29kb3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTI0NDMsImV4cCI6MjA5MDcyODQ0M30.IELtCB3cpK8Wih_x9Jt3FydidoSDZmPnMSDvatEJ3-k',
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  return <>{children}</>;
}
