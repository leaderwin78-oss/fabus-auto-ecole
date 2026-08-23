"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { ActionResult } from "@/lib/actions/courses";

export async function createInstructorService(formData: FormData): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "instructor") return { ok: false, error: "Réservé aux moniteurs." };
  if (!profile.organization_id) return { ok: false, error: "Organisation introuvable." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const duration = Number(formData.get("duration_minutes") ?? 0) || null;
  const price = Number(formData.get("price_fcfa") ?? 0);

  if (!title || !Number.isFinite(price) || price < 0) return { ok: false, error: "Titre et prix valides requis." };

  const supabase = await createClient();
  const { error } = await supabase.from("instructor_services").insert({
    organization_id: profile.organization_id,
    instructor_id: userId,
    title,
    description,
    duration_minutes: duration,
    price_fcfa: price,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/instructor/services");
  revalidatePath("/student/services");
  return { ok: true };
}

export async function toggleInstructorService(serviceId: string, isActive: boolean): Promise<ActionResult> {
  const { userId } = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("instructor_services").update({ is_active: isActive }).eq("id", serviceId).eq("instructor_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/instructor/services");
  revalidatePath("/student/services");
  return { ok: true };
}

export async function deleteInstructorService(serviceId: string): Promise<ActionResult> {
  const { userId } = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("instructor_services").delete().eq("id", serviceId).eq("instructor_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/instructor/services");
  return { ok: true };
}

// Booking creates a linked pending payment; commission is computed at
// settlement time by markPaymentPaid (extra_service rate), never here.
export async function bookInstructorService(serviceId: string): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "student") return { ok: false, error: "Réservé aux élèves." };
  if (!profile.organization_id) return { ok: false, error: "Organisation introuvable." };

  const supabase = await createClient();
  const { data: service } = await supabase.from("instructor_services").select("*").eq("id", serviceId).eq("is_active", true).single();
  if (!service) return { ok: false, error: "Prestation introuvable." };
  if (service.organization_id !== profile.organization_id) return { ok: false, error: "Cette prestation appartient à une autre auto-école." };

  const { data: booking, error } = await supabase
    .from("service_bookings")
    .insert({
      service_id: serviceId,
      student_id: userId,
      organization_id: service.organization_id,
      instructor_id: service.instructor_id,
    })
    .select()
    .single();
  if (error) return { ok: false, error: error.message };

  if (service.price_fcfa > 0) {
    const { data: payment } = await supabase
      .from("payments")
      .insert({
        organization_id: service.organization_id,
        student_id: userId,
        amount_fcfa: service.price_fcfa,
        payment_type: "extra_service",
        provider: "manual",
        status: "pending",
        extra_service_id: booking.id,
      })
      .select()
      .single();
    if (payment) await supabase.from("service_bookings").update({ payment_id: payment.id }).eq("id", booking.id);
  }

  revalidatePath("/student/services");
  revalidatePath("/instructor/services");
  return { ok: true };
}
