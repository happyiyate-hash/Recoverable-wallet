import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Robust check to prevent crash during SSR
const isValidUrl = (url: string | undefined): boolean => {
  if (!url || url === 'undefined' || url === '') return false;
  try {
    return url.startsWith('http');
  } catch {
    return false;
  }
};

/**
 * Server-side / static client initialization.
 * Used for edge cases where Supabase might still hold some asset data.
 */
export const supabase =
  isValidUrl(supabaseUrl) && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
