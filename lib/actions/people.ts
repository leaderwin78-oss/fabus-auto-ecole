"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/courses";

// Admins/instructors are never self-service: only an org admin (or the
// super_admin) can provision one, and it always happens server-side with the
// service-role key so we can create the auth.users row directly. The caller's
// own role/org — never anything from the form — decides which organization
// the new account belongs to.
export async function inviteStaffMember(formData: FormData): Promise<ActionResult> {
  const { profile } = await requireProfile();
  if (profile.role !== "admin" && profile.role !== "super_admin") {
    return { ok: false, error: "Action réservée aux administrateurs." };
  }
  if (!profile.organization_id) return { ok: false, error: "Organisation introuvable." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "instructor");
  const phone = String(formData.get("phone") ?? "").trim() || null;

  if (!email || !fullName) return { ok: false, error: "Nom et email requis." };
  if (!["instructor", "student", "admin_auto_ecole"].includes(role)) return { ok: false, error: "Rôle invalide." };

  const admin = createAdminClient();
  const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
  });

  if (inviteError || !invited.user) {
    return { ok: false, error: inviteError?.message ?? "Échec de l'invitation." };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: invited.user.id,
    organization_id: profile.organization_id,
    role,
    full_name: fullName,
    phone,
  });

  if (profileError) return { ok: false, error: profileError.message };

  revalidatePath("/admin/instructors");
  revalidatePath("/admin/students");
  return { ok: true };
}

// Reviewing a self-registered moniteur's application (see applyAsInstructor in
// lib/actions/signup.ts). Owner-only, matching every other staff-management
// action here — admin_auto_ecole runs day-to-day operations, not hiring.
// The privileged-column trigger in 0008_signup.sql is what makes this the ONLY
// way `status` can move: the applicant cannot approve themselves.
async function reviewInstructorApplication(
  userId: string,
  status: "active" | "rejected",
  reason: string | null
): Promise<ActionResult> {
  const { userId: actorId, profile } = await requireProfile();
  if (profile.role !== "admin" && profile.role !== "super_admin") {
    return { ok: false, error: "Action réservée au responsable de l'auto-école." };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, organization_id, role, status, full_name")
    .eq("id", userId)
    .eq("organization_id", profile.organization_id ?? "")
    .maybeSingle();

  if (!target) return { ok: false, error: "Candidature introuvable dans votre auto-école." };
  if (target.status !== "pending") return { ok: false, error: "Cette candidature a déjà été traitée." };

  const { error } = await supabase
    .from("profiles")
    .update({ status, rejection_reason: status === "rejected" ? reason : null })
    .eq("id", userId);
  if (error) return { ok: false, error: error.message };

  await supabase.from("notifications").insert({
    organization_id: profile.organization_id,
    user_id: userId,
    type: "instructor_application_reviewed",
    title: status === "active" ? "Candidature acceptée" : "Candidature non retenue",
    body:
      status === "active"
        ? "Votre profil moniteur a été validé. Votre espace est désormais accessible."
        : reason || "Votre candidature n'a pas été retenue.",
    link: status === "active" ? "/instructor" : "/pending",
  });

  await logActivity({
    organizationId: profile.organization_id,
    actorId,
    action: status === "active" ? "instructor.application_approved" : "instructor.application_rejected",
    entityType: "profile",
    entityId: userId,
    metadata: reason ? { reason } : {},
  });

  revalidatePath("/admin/instructors");
  return { ok: true };
}

export async function approveInstructor(userId: string): Promise<ActionResult> {
  return reviewInstructorApplication(userId, "active", null);
}

export async function rejectInstructor(userId: string, reason: string): Promise<ActionResult> {
  return reviewInstructorApplication(userId, "rejected", reason.trim() || null);
}

export async function removeStaffMember(userId: string): Promise<ActionResult> {
  const { profile } = await requireProfile();
  if (profile.role !== "admin" && profile.role !== "super_admin") {
    return { ok: false, error: "Action réservée aux administrateurs." };
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, organization_id")
    .eq("id", userId)
    .eq("organization_id", profile.organization_id ?? "")
    .single();

  if (!target) return { ok: false, error: "Utilisateur introuvable dans votre auto-école." };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/instructors");
  revalidatePath("/admin/students");
  return { ok: true };
}
