import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase/client'; // Use service_role key locally for secure admin routes if available, or RLS bypass token. 
// For demo and testing, using standard client.

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('kyc_submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch KYC records', details: err.message }, { status: 500 });
  }
}
