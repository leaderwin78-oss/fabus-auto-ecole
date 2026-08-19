"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";
import type { ActionResult } from "@/lib/actions/courses";

function slugify(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function requireSuperAdmin() {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "super_admin") return { ok: false as const, error: "Action réservée au super admin." };
  return { ok: true as const, userId };
}

export async function createOrganization(formData: FormData): Promise<ActionResult> {
  const check = await requireSuperAdmin();
  if (!check.ok) return check;

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || null;
  const adminEmail = String(formData.get("admin_email") ?? "").trim().toLowerCase();
  const adminName = String(formData.get("admin_name") ?? "").trim();
  const planId = String(formData.get("plan_id") ?? "") || null;

  if (!name || !adminEmail || !adminName) return { ok: false, error: "Nom de l'école, nom et email de l'admin requis." };

  const admin = createAdminClient();
  const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name, city, slug, status: "active" })
    .select()
    .single();

  if (orgError || !org) return { ok: false, error: orgError?.message ?? "Échec de création de l'auto-école." };

  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(adminEmail, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
  });

  if (inviteError || !invited.user) {
    return { ok: false, error: `Auto-école créée mais invitation admin échouée : ${inviteError?.message}` };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: invited.user.id,
    organization_id: org.id,
    role: "admin",
    full_name: adminName,
  });
  if (profileError) return { ok: false, error: `Auto-école créée mais profil admin échoué : ${profileError.message}` };

  if (planId) {
    await admin.from("subscriptions").insert({
      organization_id: org.id,
      plan_id: planId,
      status: "trialing",
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  revalidatePath("/super-admin/organizations");
  return { ok: true };
}

export async function updateOrganizationStatus(orgId: string, status: "active" | "suspended" | "archived"): Promise<ActionResult> {
  const check = await requireSuperAdmin();
  if (!check.ok) return check;

  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update({ status }).eq("id", orgId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/super-admin/organizations");
  return { ok: true };
}

export async function upsertPlan(formData: FormData): Promise<ActionResult> {
  const check = await requireSuperAdmin();
  if (!check.ok) return check;

  const id = String(formData.get("id") ?? "") || undefined;
  const code = String(formData.get("code") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const price = Number(formData.get("price_fcfa") ?? 0);
  const maxInstructors = formData.get("max_instructors") ? Number(formData.get("max_instructors")) : null;
  const maxStudents = formData.get("max_students") ? Number(formData.get("max_students")) : null;

  if (!code || !name) return { ok: false, error: "Code et nom requis." };

  const supabase = await createClient();
  const { error } = await supabase.from("plans").upsert({
    id,
    code,
    name,
    price_fcfa: Number.isFinite(price) ? price : 0,
    max_instructors: maxInstructors,
    max_students: maxStudents,
    is_active: true,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/super-admin/plans");
  return { ok: true };
}
