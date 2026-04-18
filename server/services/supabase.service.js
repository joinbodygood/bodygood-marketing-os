import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url) {
  console.warn('[supabase] SUPABASE_URL is not set — DB calls will fail');
}

// Service-role client — bypasses RLS. Use server-side only.
export const supabaseAdmin =
  url && serviceKey
    ? createClient(url, serviceKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

// Anon client — respects RLS. Used for JWT verification flows.
export const supabaseAnon =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export function requireAdmin() {
  if (!supabaseAdmin) {
    throw new Error(
      'supabaseAdmin not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }
  return supabaseAdmin;
}
