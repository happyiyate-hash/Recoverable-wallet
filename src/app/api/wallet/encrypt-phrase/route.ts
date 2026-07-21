import { NextRequest, NextResponse } from 'next/server';
import { encryptPhrase } from '@/lib/crypto';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * GENERIC SECURE ENCRYPTION ENDPOINT
 * Version: 7.0.0 (Production Migration Standard)
 */

const SUPABASE_URL = 'https://xcjididoxzpymqwodouk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjamlkaWRveHpweW1xd29kb3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTI0NDMsImV4cCI6MjA5MDcyODQ0M30.IELtCB3cpK8Wih_x9Jt3FydidoSDZmPnMSDvatEJ3-k';

export async function POST(req: NextRequest) {
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          cookies: {
            get(name: string) { return cookieStore.get(name)?.value },
            set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }) },
            remove(name: string, options: any) { cookieStore.set({ name, value: '', ...options }) },
          },
        }
    );

    try {
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];

        const { data: { user }, error: authError } = token 
            ? await supabase.auth.getUser(token)
            : await supabase.auth.getUser();

        if (authError || !user) {
            console.warn("[API_ENCRYPT_UNAUTHORIZED] Session verification failed.");
            return NextResponse.json({ message: 'Unauthorized: Session missing' }, { status: 401 });
        }

        const body = await req.json();
        const payload = body.text || body.phrase;

        if (!payload || typeof payload !== 'string') {
            return NextResponse.json({ message: 'Plaintext string required.' }, { status: 400 });
        }

        // EXECUTE CRYPTOGRAPHIC HANDSHAKE
        const { encrypted, iv } = encryptPhrase(payload);

        return NextResponse.json({ 
            success: true,
            encrypted, 
            iv 
        });

    } catch (error: any) {
        console.error('[API_ENCRYPT_ERROR]', error.message);
        return NextResponse.json({ 
            success: false, 
            message: 'Encryption protocol failed.' 
        }, { status: 500 });
    }
}
