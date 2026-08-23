"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { recordReferralJoin } from "@/lib/actions/referrals";
import { ensureEmailAvailable } from "@/lib/signup/account";
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

  await logActivity({ organizationId: org.id, actorId: check.userId, action: "organization.created_by_super_admin", entityType: "organization", entityId: org.id });
  revalidatePath("/super-admin/organizations");
  return { ok: true };
}

export type OrgStatus = "pending" | "active" | "suspended" | "archived" | "rejected";

export async function updateOrganizationStatus(orgId: string, status: OrgStatus): Promise<ActionResult> {
  const check = await requireSuperAdmin();
  if (!check.ok) return check;

  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update({ status }).eq("id", orgId);
  if (error) return { ok: false, error: error.message };

  // First approval starts the free trial (section 6): 3 months (configurable
  // via platform_settings.trial_days), only if no subscription exists yet —
  // re-approving a previously suspended school never resets its trial/plan.
  if (status === "active") {
    const { data: existingSub } = await supabase.from("subscriptions").select("id").eq("organization_id", orgId).limit(1).maybeSingle();
    if (!existingSub) {
      const { data: settings } = await supabase.from("platform_settings").select("trial_days").eq("id", true).single();
      const { data: freePlan } = await supabase.from("plans").select("id").eq("code", "free").maybeSingle();
      const trialDays = settings?.trial_days ?? 90;
      const trialStart = new Date();
      const trialEnd = new Date(trialStart.getTime() + trialDays * 24 * 60 * 60 * 1000);

      if (freePlan) {
        await supabase.from("subscriptions").insert({
          organization_id: orgId,
          plan_id: freePlan.id,
          status: "trialing",
          trial_start: trialStart.toISOString(),
          trial_end: trialEnd.toISOString(),
          current_period_start: trialStart.toISOString(),
          current_period_end: trialEnd.toISOString(),
        });
      }
    }
  }

  await logActivity({ organizationId: orgId, actorId: check.userId, action: `organization.status_changed:${status}`, entityType: "organization", entityId: orgId });
  revalidatePath("/super-admin/organizations");
  return { ok: true };
}

export async function rejectOrganization(orgId: string, reason: string): Promise<ActionResult> {
  const check = await requireSuperAdmin();
  if (!check.ok) return check;

  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update({ status: "rejected", rejection_reason: reason || null }).eq("id", orgId);
  if (error) return { ok: false, error: error.message };

  await logActivity({ organizationId: orgId, actorId: check.userId, action: "organization.rejected", entityType: "organization", entityId: orgId, metadata: { reason } });
  revalidatePath("/super-admin/organizations");
  return { ok: true };
}

// Public self-registration (section 4): a school applies with a full
// questionnaire and starts in 'pending' — invisible on the public directory
// (organizations_select_public only shows status='active') until a
// super_admin approves it. Creates the founding admin account in the same
// call since there's no other authenticated user yet to attach the org to.
export async function applyAsSchool(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const responsableName = String(formData.get("responsable_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const quartier = String(formData.get("quartier") ?? "").trim() || null;
  const city = String(formData.get("city") ?? "").trim() || null;
  const region = String(formData.get("region") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const idNumber = String(formData.get("id_number") ?? "").trim() || null;
  const servicesRaw = formData.getAll("services").map(String);
  const pricing = {
    inscription: Number(formData.get("price_inscription") ?? 0) || null,
    permis: Number(formData.get("price_permis") ?? 0) || null,
    perfectionnement: Number(formData.get("price_perfectionnement") ?? 0) || null,
  };
  const equipment = {
    vehicules: String(formData.get("equip_vehicules") ?? "").trim() || null,
    simulateurs: String(formData.get("equip_simulateurs") ?? "").trim() || null,
    salles: String(formData.get("equip_salles") ?? "").trim() || null,
  };
  const termsAccepted = formData.get("terms_accepted") === "on";
  const password = String(formData.get("password") ?? "");

  if (!name || !responsableName || !email || !password) {
    return { ok: false, error: "Nom de l'école, responsable, email et mot de passe requis." };
  }
  if (!termsAccepted) {
    return { ok: false, error: "Vous devez accepter les conditions générales et la politique de confidentialité." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Le mot de passe doit contenir au moins 8 caractères." };
  }

  const admin = createAdminClient();

  // Check the address BEFORE inserting the organization. This used to run
  // after, so a taken email left a pending auto-école behind with no admin
  // account attached — invisible to the applicant, but sitting in the super
  // admin's approval queue, and repeated once per retry.
  const emailCheck = await ensureEmailAvailable(admin, email);
  if (!emailCheck.ok) return { ok: false, error: emailCheck.error };

  const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({
      name,
      city,
      slug,
      status: "pending",
      phone: phone || null,
      email: email || null,
      responsable_name: responsableName,
      address,
      quartier,
      region,
      description,
      id_number: idNumber,
      services: servicesRaw,
      pricing,
      equipment,
      terms_accepted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (orgError || !org) return { ok: false, error: orgError?.message ?? "Échec de la création de la demande." };

  const { data: created, error: createUserError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createUserError || !created.user) {
    // Undo the organization: a school with no way to sign in is not a
    // "registered request", it is a row nobody can ever claim.
    await admin.from("organizations").delete().eq("id", org.id);
    return { ok: false, error: `Compte non créé : ${createUserError?.message ?? "erreur inconnue"}` };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    organization_id: org.id,
    role: "admin",
    full_name: responsableName,
    phone: phone || null,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    await admin.from("organizations").delete().eq("id", org.id);
    return { ok: false, error: `Inscription non finalisée : ${profileError.message}` };
  }

  const refCode = String(formData.get("ref_code") ?? "").trim();
  if (refCode) await recordReferralJoin(refCode, created.user.id);

  await logActivity({ organizationId: org.id, actorId: created.user.id, action: "organization.applied", entityType: "organization", entityId: org.id });
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
