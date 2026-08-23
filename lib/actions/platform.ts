"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/courses";
import { erreurInterne } from "@/lib/actions/errors";

export async function updatePlatformSettings(formData: FormData): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "super_admin") return { ok: false, error: "Réservé au super admin." };

  const courseCommission = Number(formData.get("course_platform_commission_percent"));
  const registrationFee = Number(formData.get("registration_platform_fee_percent"));
  const extraServiceCommission = Number(formData.get("extra_service_commission_percent"));
  const trialDays = Number(formData.get("trial_days"));

  for (const [label, v] of [
    ["Commission cours", courseCommission],
    ["Frais d'inscription", registrationFee],
    ["Commission prestations", extraServiceCommission],
  ] as const) {
    if (!Number.isFinite(v) || v < 0 || v > 100) return { ok: false, error: `${label} doit être entre 0 et 100.` };
  }
  if (!Number.isFinite(trialDays) || trialDays < 0) return { ok: false, error: "Durée d'essai invalide." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_settings")
    .update({
      course_platform_commission_percent: courseCommission,
      registration_platform_fee_percent: registrationFee,
      extra_service_commission_percent: extraServiceCommission,
      trial_days: trialDays,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq("id", true);

  if (error) return { ok: false, error: erreurInterne(error, "platform") };

  await logActivity({ organizationId: null, actorId: userId, action: "platform_settings.updated", metadata: { courseCommission, registrationFee, extraServiceCommission, trialDays } });
  revalidatePath("/super-admin/finance");
  return { ok: true };
}
