"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/courses";
import { erreurInterne } from "@/lib/actions/errors";

async function requireSuperAdmin() {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "super_admin") return { ok: false as const, error: "Action réservée au super admin." };
  return { ok: true as const, userId };
}

export async function createPrivacyPolicyVersion(formData: FormData): Promise<ActionResult> {
  const check = await requireSuperAdmin();
  if (!check.ok) return check;

  const version = String(formData.get("version") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!version || !title || !content) return { ok: false, error: "Version, titre et contenu requis." };

  const supabase = await createClient();
  const { error } = await supabase.from("privacy_policies").insert({
    version,
    title,
    content,
    status: "draft",
    created_by: check.userId,
  });

  if (error) return { ok: false, error: error.code === "23505" ? "Cette version existe déjà." : error.message };
  revalidatePath("/super-admin/privacy-policy");
  return { ok: true };
}

export async function publishPrivacyPolicy(policyId: string): Promise<ActionResult> {
  const check = await requireSuperAdmin();
  if (!check.ok) return check;

  const supabase = await createClient();
  // Only one version is "published" (current) at a time — archive the rest.
  await supabase.from("privacy_policies").update({ status: "archived" }).eq("status", "published");
  const { error } = await supabase.from("privacy_policies").update({ status: "published", published_at: new Date().toISOString() }).eq("id", policyId);
  if (error) return { ok: false, error: erreurInterne(error, "privacy") };

  await logActivity({ organizationId: null, actorId: check.userId, action: "privacy_policy.published", entityType: "privacy_policy", entityId: policyId });
  revalidatePath("/super-admin/privacy-policy");
  revalidatePath("/confidentialite");
  return { ok: true };
}

export async function acceptCurrentPrivacyPolicy(): Promise<ActionResult> {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const { data: policy } = await supabase.from("privacy_policies").select("id").eq("status", "published").order("published_at", { ascending: false }).limit(1).maybeSingle();
  if (!policy) return { ok: false, error: "Aucune politique publiée." };

  const { error } = await supabase.from("privacy_policy_acceptances").upsert(
    { user_id: userId, policy_id: policy.id },
    { onConflict: "user_id,policy_id" }
  );
  if (error) return { ok: false, error: erreurInterne(error, "privacy") };
  return { ok: true };
}
