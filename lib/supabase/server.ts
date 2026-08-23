import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseUrl, supabaseAnonKey } from "@/lib/env";

// Server Component / Server Action / Route Handler client.
// Reads the session from cookies; writes are silently ignored when called
// from a Server Component (Next.js forbids setting cookies there) — the
// middleware is responsible for refreshing the session cookie on navigation.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl(),
    supabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore, middleware handles refresh.
          }
        },
      },
    }
  );
}
