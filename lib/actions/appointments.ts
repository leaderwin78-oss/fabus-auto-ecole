"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isOrgStaffRole } from "@/lib/auth";
import type { ActionResult } from "@/lib/actions/courses";

// Maps a Postgres exclusion-constraint violation (double-booking) to a
// message a non-technical user can act on, instead of a raw DB error.
function friendlyAppointmentError(message: string): string {
  if (message.includes("appointments_no_instructor_overlap")) {
    return "Ce moniteur a déjà une séance sur ce créneau. Choisissez un autre horaire.";
  }
  if (message.includes("appointments_no_student_overlap")) {
    return "Vous avez déjà une séance sur ce créneau. Choisissez un autre horaire.";
  }
  return message;
}

export async function createAppointment(formData: FormData): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  if (!isOrgStaffRole(profile.role) && profile.role !== "instructor" && profile.role !== "super_admin") {
    return { ok: false, error: "Action réservée au personnel de l'auto-école." };
  }
  if (!profile.organization_id) return { ok: false, error: "Organisation introuvable." };

  const type = String(formData.get("type") ?? "driving_session");
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const studentId = String(formData.get("student_id") ?? "") || null;
  const instructorId = profile.role === "instructor" ? userId : String(formData.get("instructor_id") ?? "") || null;
  const startTime = String(formData.get("start_time") ?? "");
  const endTime = String(formData.get("end_time") ?? "");
  const location = String(formData.get("location") ?? "").trim() || null;

  if (!title || !startTime || !endTime) return { ok: false, error: "Titre, date de début et de fin requis." };
  if (new Date(endTime) <= new Date(startTime)) return { ok: false, error: "L'heure de fin doit être après l'heure de début." };

  const meetingUrl = type === "video_course" ? `https://meet.jit.si/auto-ecole-${crypto.randomUUID()}` : null;

  const supabase = await createClient();
  const { error } = await supabase.from("appointments").insert({
    organization_id: profile.organization_id,
    type,
    title,
    description,
    instructor_id: instructorId,
    student_id: studentId,
    start_time: new Date(startTime).toISOString(),
    end_time: new Date(endTime).toISOString(),
    status: "scheduled",
    location,
    meeting_provider: type === "video_course" ? "jitsi" : null,
    meeting_url: meetingUrl,
    created_by: userId,
  });

  if (error) return { ok: false, error: friendlyAppointmentError(error.message) };

  revalidatePath("/instructor/calendar");
  revalidatePath("/admin/calendar");
  revalidatePath("/student/calendar");
  revalidatePath("/student");
  return { ok: true };
}

export async function updateAppointmentStatus(
  appointmentId: string,
  status: "confirmed" | "canceled" | "completed" | "no_show"
): Promise<ActionResult> {
  const { profile } = await requireProfile();
  if (!isOrgStaffRole(profile.role) && profile.role !== "instructor" && profile.role !== "super_admin") {
    return { ok: false, error: "Action réservée au personnel de l'auto-école." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("appointments").update({ status }).eq("id", appointmentId);
  if (error) return { ok: false, error: friendlyAppointmentError(error.message) };

  revalidatePath("/instructor/calendar");
  revalidatePath("/admin/calendar");
  revalidatePath("/student/calendar");
  return { ok: true };
}

export async function addSessionNote(formData: FormData): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "instructor" && !isOrgStaffRole(profile.role)) {
    return { ok: false, error: "Action réservée aux moniteurs." };
  }

  const appointmentId = String(formData.get("appointment_id") ?? "");
  const observations = String(formData.get("observations") ?? "").trim() || null;
  if (!appointmentId) return { ok: false, error: "Séance introuvable." };

  const supabase = await createClient();
  const { error } = await supabase.from("session_notes").insert({
    appointment_id: appointmentId,
    instructor_id: userId,
    observations,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/instructor/calendar");
  return { ok: true };
}
