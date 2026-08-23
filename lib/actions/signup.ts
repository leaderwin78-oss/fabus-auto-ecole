"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/audit";
import { recordReferralJoin } from "@/lib/actions/referrals";
import type { ActionResult } from "@/lib/actions/courses";

// Self-registration for the two profiles that can create their own account
// against an existing school. Both run server-side with the service-role key
// for the same reason applyAsSchool() does: the auth.users row and the
// profiles row must be created together, and the *server* — never the form —
// decides the role and the account status.
//
// Schools have their own entry point in lib/actions/organizations.ts
// (applyAsSchool) because they create the tenant itself, not a member of one.

const MIN_AGE = 16;

function parseBirthDate(raw: string): { iso: string | null; error: string | null } {
  if (!raw) return { iso: null, error: "Votre date de naissance est requise." };
  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return { iso: null, error: "Date de naissance invalide." };

  const now = new Date();
  let age = now.getUTCFullYear() - date.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < date.getUTCMonth() ||
    (now.getUTCMonth() === date.getUTCMonth() && now.getUTCDate() < date.getUTCDate());
  if (beforeBirthday) age -= 1;

  if (age < MIN_AGE) return { iso: null, error: `Vous devez avoir au moins ${MIN_AGE} ans pour créer un compte.` };
  if (age > 100) return { iso: null, error: "Date de naissance invalide." };
  return { iso: date.toISOString().slice(0, 10), error: null };
}

// The school a self-registering user attaches to must exist AND be approved —
// otherwise anyone could join a pending or rejected school by pasting its id.
async function requireActiveSchool(admin: ReturnType<typeof createAdminClient>, organizationId: string) {
  if (!organizationId) return { ok: false as const, error: "Merci de choisir votre auto-école." };
  const { data: org } = await admin
    .from("organizations")
    .select("id, name, status")
    .eq("id", organizationId)
    .maybeSingle();
  if (!org) return { ok: false as const, error: "Auto-école introuvable." };
  if (org.status !== "active") return { ok: false as const, error: "Cette auto-école n'est pas encore active sur la plateforme." };
  return { ok: true as const, org };
}

interface CommonFields {
  fullName: string;
  email: string;
  phone: string | null;
  password: string;
  birthDate: string;
  gender: string | null;
  organizationId: string;
  termsAccepted: boolean;
  refCode: string;
}

function readCommonFields(formData: FormData): CommonFields {
  return {
    fullName: String(formData.get("full_name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    phone: String(formData.get("phone") ?? "").trim() || null,
    password: String(formData.get("password") ?? ""),
    birthDate: String(formData.get("birth_date") ?? "").trim(),
    gender: String(formData.get("gender") ?? "").trim() || null,
    organizationId: String(formData.get("organization_id") ?? "").trim(),
    termsAccepted: formData.get("terms_accepted") === "on",
    refCode: String(formData.get("ref_code") ?? "").trim(),
  };
}

function validateCommon(f: CommonFields): string | null {
  if (!f.fullName) return "Votre nom complet est requis.";
  if (!f.email) return "Votre email est requis.";
  if (f.password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
  if (!f.termsAccepted) return "Vous devez accepter les conditions générales et la politique de confidentialité.";
  return null;
}

export async function registerStudent(formData: FormData): Promise<ActionResult> {
  const f = readCommonFields(formData);

  const invalid = validateCommon(f);
  if (invalid) return { ok: false, error: invalid };

  const { iso: birthDate, error: birthError } = parseBirthDate(f.birthDate);
  if (birthError) return { ok: false, error: birthError };

  const admin = createAdminClient();
  const school = await requireActiveSchool(admin, f.organizationId);
  if (!school.ok) return school;

  const { data: created, error: createUserError } = await admin.auth.admin.createUser({
    email: f.email,
    password: f.password,
    email_confirm: true,
  });
  if (createUserError || !created.user) {
    const message = createUserError?.message ?? "";
    if (message.toLowerCase().includes("already been registered") || message.toLowerCase().includes("already registered")) {
      return { ok: false, error: "Un compte existe déjà avec cet email. Connectez-vous plutôt." };
    }
    return { ok: false, error: `Compte non créé : ${message}` };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    organization_id: f.organizationId,
    role: "student",
    status: "active",
    full_name: f.fullName,
    phone: f.phone,
    birth_date: birthDate,
    gender: f.gender,
  });

  if (profileError) {
    // Don't strand an auth user with no profile — it would block the email
    // from ever being reused and leave the account unusable.
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: `Profil non créé : ${profileError.message}` };
  }

  if (f.refCode) await recordReferralJoin(f.refCode, created.user.id);

  await logActivity({
    organizationId: f.organizationId,
    actorId: created.user.id,
    action: "student.self_registered",
    entityType: "profile",
    entityId: created.user.id,
  });

  return { ok: true };
}

const LICENCE_CATEGORIES = ["A", "B", "C", "D", "E", "F"];

export async function applyAsInstructor(formData: FormData): Promise<ActionResult> {
  const f = readCommonFields(formData);

  const invalid = validateCommon(f);
  if (invalid) return { ok: false, error: invalid };

  const { iso: birthDate, error: birthError } = parseBirthDate(f.birthDate);
  if (birthError) return { ok: false, error: birthError };

  const licenseNumber = String(formData.get("license_number") ?? "").trim();
  if (!licenseNumber) return { ok: false, error: "Votre numéro d'agrément / permis est requis." };

  const yearsRaw = String(formData.get("years_experience") ?? "").trim();
  const yearsExperience = yearsRaw ? Number(yearsRaw) : null;
  if (yearsExperience !== null && (!Number.isFinite(yearsExperience) || yearsExperience < 0 || yearsExperience > 60)) {
    return { ok: false, error: "Nombre d'années d'expérience invalide." };
  }

  const categories = formData.getAll("teaching_categories").map(String).filter((c) => LICENCE_CATEGORIES.includes(c));
  if (categories.length === 0) return { ok: false, error: "Sélectionnez au moins une catégorie enseignée." };

  const bio = String(formData.get("bio") ?? "").trim() || null;

  const admin = createAdminClient();
  const school = await requireActiveSchool(admin, f.organizationId);
  if (!school.ok) return school;

  const { data: created, error: createUserError } = await admin.auth.admin.createUser({
    email: f.email,
    password: f.password,
    email_confirm: true,
  });
  if (createUserError || !created.user) {
    const message = createUserError?.message ?? "";
    if (message.toLowerCase().includes("already been registered") || message.toLowerCase().includes("already registered")) {
      return { ok: false, error: "Un compte existe déjà avec cet email. Connectez-vous plutôt." };
    }
    return { ok: false, error: `Compte non créé : ${message}` };
  }

  // status='pending' is the whole point of this flow: an instructor account
  // grants access to a school's students, so it stays walled off from every
  // tenant table (see same_org() in 0008_signup.sql) until the school's owner
  // approves it from /admin/instructors.
  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    organization_id: f.organizationId,
    role: "instructor",
    status: "pending",
    full_name: f.fullName,
    phone: f.phone,
    birth_date: birthDate,
    gender: f.gender,
    license_number: licenseNumber,
    years_experience: yearsExperience,
    teaching_categories: categories,
    bio,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: `Profil non créé : ${profileError.message}` };
  }

  if (f.refCode) await recordReferralJoin(f.refCode, created.user.id);

  // Tell the school's owners there is a file waiting for them.
  const { data: owners } = await admin
    .from("profiles")
    .select("id")
    .eq("organization_id", f.organizationId)
    .in("role", ["admin", "admin_auto_ecole"]);

  if (owners && owners.length > 0) {
    await admin.from("notifications").insert(
      owners.map((owner) => ({
        organization_id: f.organizationId,
        user_id: owner.id,
        type: "instructor_application",
        title: "Nouvelle candidature de moniteur",
        body: `${f.fullName} souhaite rejoindre votre auto-école en tant que moniteur.`,
        link: "/admin/instructors",
      }))
    );
  }

  await logActivity({
    organizationId: f.organizationId,
    actorId: created.user.id,
    action: "instructor.applied",
    entityType: "profile",
    entityId: created.user.id,
  });

  return { ok: true };
}
