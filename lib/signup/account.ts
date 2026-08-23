import type { SupabaseClient } from "@supabase/supabase-js";

// NOT a "use server" module on purpose: every export of a "use server" file
// becomes an endpoint callable from the browser, and an internet-facing
// "delete the account using this email" function would be an account-takeover
// vector. This is a plain server-side helper, imported only by server actions.

// An auth.users row with no matching profile is unusable garbage: the owner
// can sign in but has no role, no tenant and no dashboard. It is produced by
// any signup that creates the auth user and then fails before inserting the
// profile — which is exactly what the old browser-side student signup did when
// Supabase required email confirmation (no session yet, so RLS rejected the
// profile insert).
//
// Such a row still reserves the address, so the next honest attempt to sign up
// with it fails with "A user with this email address has already been
// registered" and the person is stuck forever. Reclaiming it is safe: only
// rows WITHOUT a profile qualify, and every real account has one.
export async function ensureEmailAvailable(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any>,
  email: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const normalized = email.trim().toLowerCase();

  // listUsers is paginated; walk until the address is found or pages run out.
  let existing: { id: string } | null = null;
  for (let page = 1; page <= 20 && !existing; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) break;
    const hit = data.users.find((u) => (u.email ?? "").toLowerCase() === normalized);
    if (hit) existing = { id: hit.id };
    if (data.users.length < 200) break;
  }

  if (!existing) return { ok: true };

  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", existing.id)
    .maybeSingle();

  if (profile) {
    return {
      ok: false,
      error:
        "Un compte existe déjà avec cette adresse email. Connectez-vous, ou utilisez une autre adresse pour cette inscription.",
    };
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(existing.id);
  if (deleteError) {
    return {
      ok: false,
      error:
        "Cette adresse email est bloquée par une inscription précédente incomplète. Utilisez une autre adresse ou contactez le support.",
    };
  }

  return { ok: true };
}
