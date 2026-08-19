import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Privileged client using the service role key — bypasses RLS.
// Server-only: never import this from a Client Component or expose the key to the browser.
// Used for platform-level operations only the super_admin flow needs
// (creating an auto-école together with its first admin user, seeding demo data).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL missing — required for admin operations."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
