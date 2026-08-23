"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isOrgStaffRole } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { computeCommission, type PaymentType } from "@/lib/payments/commission";
import { MontantFcfaPositif, Uuid } from "@/lib/validation";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions/courses";
import { getPaymentProvider, type ProviderId } from "@/lib/payments/provider";
import { erreurInterne } from "@/lib/actions/errors";

export async function createPaymentRequest(formData: FormData): Promise<ActionResult> {
  const { profile } = await requireProfile();
  if (!isOrgStaffRole(profile.role) && profile.role !== "super_admin") {
    return { ok: false, error: "Action réservée aux administrateurs." };
  }
  if (!profile.organization_id) return { ok: false, error: "Organisation introuvable." };

  const provider = String(formData.get("provider") ?? "manual") as ProviderId;
  const paymentType = String(formData.get("payment_type") ?? "registration") as PaymentType;

  // Le montant n'était borné que par le bas : un entier arbitrairement grand,
  // ou un identifiant d'élève qui n'est pas un UUID, atteignait la base.
  const parsed = z
    .object({ student_id: Uuid, amount_fcfa: MontantFcfaPositif })
    .safeParse({
      student_id: String(formData.get("student_id") ?? ""),
      amount_fcfa: formData.get("amount_fcfa") ?? 0,
    });
  if (!parsed.success) {
    return { ok: false, error: "Élève et montant valides requis (montant entier, supérieur à 0)." };
  }
  const { student_id: studentId, amount_fcfa: amount } = parsed.data;

  const supabase = await createClient();
  const { error } = await supabase.from("payments").insert({
    organization_id: profile.organization_id,
    student_id: studentId,
    amount_fcfa: amount,
    provider,
    payment_type: paymentType,
    status: "pending",
  });

  if (error) return { ok: false, error: erreurInterne(error, "payments") };
  revalidatePath("/admin/payments");
  revalidatePath("/student/payments");
  return { ok: true };
}

export async function markPaymentPaid(paymentId: string): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  if (!isOrgStaffRole(profile.role) && profile.role !== "super_admin") {
    return { ok: false, error: "Action réservée aux administrateurs." };
  }

  const supabase = await createClient();

  const { data: pending } = await supabase.from("payments").select("*").eq("id", paymentId).single();
  if (!pending) return { ok: false, error: "Paiement introuvable." };

  // Commission/fee breakdown is computed here — server-side, at the moment
  // of settlement — and never trusted from the client (section 8).
  const breakdown = await computeCommission(supabase, pending.payment_type, pending.amount_fcfa);

  const { data: payment, error } = await supabase
    .from("payments")
    .update({
      status: "success",
      paid_at: new Date().toISOString(),
      gross_amount_fcfa: breakdown.grossAmountFcfa,
      platform_commission_fcfa: breakdown.platformCommissionFcfa,
      seller_amount_fcfa: breakdown.sellerAmountFcfa,
    })
    .eq("id", paymentId)
    .select()
    .single();

  if (error) return { ok: false, error: erreurInterne(error, "payments") };

  // Every successful payment gets a real invoice (section 14: "reçu, facture").
  // The number is randomized rather than sequential to avoid a race between
  // two admins marking payments paid at the same moment.
  const invoiceNumber = `FA-${new Date().getFullYear()}-${paymentId.slice(0, 8).toUpperCase()}`;
  const { error: invoiceError } = await supabase.from("invoices").insert({
    organization_id: payment.organization_id,
    student_id: payment.student_id,
    payment_id: payment.id,
    number: invoiceNumber,
    amount_fcfa: payment.amount_fcfa,
    status: "success",
    issued_at: new Date().toISOString(),
  });
  if (invoiceError && invoiceError.code !== "23505") {
    return { ok: false, error: `Paiement validé mais facture non générée : ${invoiceError.message}` };
  }

  if (payment.extra_service_id) {
    await supabase.from("service_bookings").update({ status: "confirmed" }).eq("id", payment.extra_service_id);
  }

  await logActivity({
    organizationId: payment.organization_id,
    actorId: userId,
    action: `payment.settled:${payment.payment_type}`,
    entityType: "payment",
    entityId: payment.id,
    metadata: { gross: breakdown.grossAmountFcfa, commission: breakdown.platformCommissionFcfa, rate: breakdown.ratePercent },
  });

  revalidatePath("/admin/payments");
  revalidatePath("/student/payments");
  revalidatePath("/super-admin/finance");
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
