
import { createClient } from '@supabase/supabase-js';

/**
 * INSTITUTIONAL LOGO & METADATA REGISTRY (SERVER-ONLY HARDCODED)
 * Project: gcghriodmljkusdduhzl
 * Version: 7.0.0 (Production Hardened)
 */

const LOGO_SUPABASE_URL = 'https://gcghriodmljkusdduhzl.supabase.co';
const LOGO_SUPABASE_SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdjZ2hyaW9kbWxqa3VzZGR1aHpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTkzOTMxNCwiZXhwIjoyMDg3NTE1MzE0fQ.QCWXCs-K4C96zvQcvaBLNqVqxAA7GKUXEulEruVbaE4';

export const logoSupabase = createClient(LOGO_SUPABASE_URL, LOGO_SUPABASE_SERVICE_ROLE, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});
