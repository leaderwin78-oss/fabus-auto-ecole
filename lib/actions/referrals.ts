"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";
import type { ActionResult } from "@/lib/actions/courses";

function generateCode(fullName: string): string {
  const base = fullName.split(" ")[0]?.toLowerCase().replace(/[^a-z]/g, "") ?? "ami";
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function getOrCreateReferralCode(): Promise<{ code: string } | { error: string }> {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const { data: existing } = await supabase.from("referrals").select("code").eq("inviter_id", userId).is("invited_user_id", null).limit(1).maybeSingle();
  if (existing) return { code: existing.code };

  const code = generateCode(profile.full_name);
  const { error } = await supabase.from("referrals").insert({ inviter_id: userId, code });
  if (error) return { error: error.message };
  return { code };
}

// Called right after a new account's profile is created (student signup or
// school application) if a `?ref=` code was present. Uses the service-role
// client because the brand-new user has no rows of their own to satisfy the
// normal "inviter_id = auth.uid()" RLS check on this write.
export async function recordReferralJoin(code: string, newUserId: string): Promise<ActionResult> {
  if (!code) return { ok: true };
  const admin = createAdminClient();

  const { data: referral } = await admin.from("referrals").select("*").eq("code", code).is("invited_user_id", null).limit(1).maybeSingle();
  if (!referral) return { ok: true };

  await admin.from("referrals").update({ invited_user_id: newUserId, status: "joined", joined_at: new Date().toISOString() }).eq("id", referral.id);
  return { ok: true };
}
