import { createClient } from '@supabase/supabase-js';

/**
 * INSTITUTIONAL ADMIN PORTAL CLIENT
 * Version: 2.0.0 (Production Migration Standard)
 */

const supabaseUrl = 'https://xcjididoxzpymqwodouk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjamlkaWRveHpweW1xd29kb3VrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNTI0NDMsImV4cCI6MjA5MDcyODQ0M30.IELtCB3cpK8Wih_x9Jt3FydidoSDZmPnMSDvatEJ3-k';

export const supabase = createClient(supabaseUrl, supabaseKey);
