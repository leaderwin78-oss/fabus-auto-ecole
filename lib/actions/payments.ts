"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { ActionResult } from "@/lib/actions/courses";
import { getPaymentProvider, type ProviderId } from "@/lib/payments/provider";

export async function createPaymentRequest(formData: FormData): Promise<ActionResult> {
  const { profile } = await requireProfile();
  if (profile.role !== "admin" && profile.role !== "super_admin") {
    return { ok: false, error: "Action réservée aux administrateurs." };
  }
  if (!profile.organization_id) return { ok: false, error: "Organisation introuvable." };

  const studentId = String(formData.get("student_id") ?? "");
  const amount = Number(formData.get("amount_fcfa") ?? 0);
  const provider = String(formData.get("provider") ?? "manual") as ProviderId;

  if (!studentId || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false, error: "Élève et montant valides requis." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    organization_id: profile.organization_id,
    student_id: studentId,
    amount_fcfa: amount,
    provider,
    status: "pending",
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/payments");
  revalidatePath("/student/payments");
  return { ok: true };
}

export async function markPaymentPaid(paymentId: string): Promise<ActionResult> {
  const { profile } = await requireProfile();
  if (profile.role !== "admin" && profile.role !== "super_admin") {
    return { ok: false, error: "Action réservée aux administrateurs." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("payments")
    .update({ status: "success", paid_at: new Date().toISOString() })
    .eq("id", paymentId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/payments");
  revalidatePath("/student/payments");
  return { ok: true };
}

export interface PayResult extends ActionResult {
  message?: string;
}

// Called from the student's "Payer" button. Honest by construction: it only
// ever confirms success for the 'manual' path (mark-as-pending, admin
// reconciles) — wave/orange_money report themselves as not configured rather
// than simulating a charge. See lib/payments/provider.ts.
export async function initiatePayment(paymentId: string, provider: ProviderId): Promise<PayResult> {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "student") return { ok: false, error: "Réservé aux élèves." };
  if (!profile.organization_id) return { ok: false, error: "Organisation introuvable." };

  const supabase = await createClient();
  const { data: payment } = await supabase.from("payments").select("*").eq("id", paymentId).eq("student_id", userId).single();
  if (!payment) return { ok: false, error: "Paiement introuvable." };

  const adapter = getPaymentProvider(provider);
  const result = await adapter.initiate({
    amountFcfa: payment.amount_fcfa,
    studentId: userId,
    organizationId: profile.organization_id,
    reference: payment.id,
  });

  if (adapter.isConfigured()) {
    await supabase.from("payments").update({ provider }).eq("id", paymentId);
  }

  revalidatePath("/student/payments");
  return { ok: result.ok, message: result.message };
}
