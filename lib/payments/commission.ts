import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

export type PaymentType = "registration" | "course" | "extra_service" | "subscription" | "other";

export interface CommissionBreakdown {
  grossAmountFcfa: number;
  platformCommissionFcfa: number;
  /** Part reversée au parrain de l'élève, 0 s'il n'y en a pas. */
  referralAmountFcfa: number;
  referralRatePercent: number;
  /** Identifiant du parrain, null s'il n'y en a pas. */
  referrerId: string | null;
  /** Ce qui revient réellement à l'auto-école, une fois tout déduit. */
  sellerAmountFcfa: number;
  ratePercent: number;
}

// The only place commission/fee percentages are read and applied — always
// server-side, at settlement time, never trusted from the client (section 8
// of the brief: "Ne jamais calculer uniquement côté frontend").
export async function computeCommission(
  // Conservé pour la compatibilité des appels existants, mais volontairement
  // inutilisé : les taux sont lus avec la clé service_role (voir ci-dessous).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _supabase: SupabaseClient<any>,
  paymentType: PaymentType,
  grossAmountFcfa: number,
  /** Élève concerné : sert à retrouver son parrain sur une inscription. */
  studentId?: string
): Promise<CommissionBreakdown> {
  // platform_settings n'est lisible que par le super admin (0011) : les taux de
  // commission sont les conditions commerciales de la plateforme, elles n'ont
  // pas à être lisibles par une auto-école ni, comme c'était le cas, par un
  // visiteur anonyme. La lecture passe donc par la clé service_role.
  const admin = createAdminClient();
  const { data: settings, error } = await admin.from("platform_settings").select("*").eq("id", true).single();

  // Échouer bruyamment plutôt que de retomber en silence sur les valeurs par
  // défaut : une commission calculée avec le mauvais taux ne se voit pas, et
  // se corrige mal une fois les paiements enregistrés.
  if (error || !settings) {
    throw new Error(`Taux de commission illisibles : ${error?.message ?? "aucun réglage trouvé"}`);
  }

  const rate =
    paymentType === "course"
      ? Number(settings?.course_platform_commission_percent ?? 20)
      : paymentType === "registration"
      ? Number(settings?.registration_platform_fee_percent ?? 5)
      : paymentType === "extra_service"
      ? Number(settings?.extra_service_commission_percent ?? 20)
      : 0;

  const platformCommissionFcfa = Math.round((grossAmountFcfa * rate) / 100);

  // Parrainage : uniquement sur l'inscription, et uniquement si l'élève a été
  // amené par quelqu'un. La part sort de celle de l'auto-école — voir le
  // commentaire de 0012_parrainage_remunere.sql pour la répartition complète.
  let referrerId: string | null = null;
  let referralAmountFcfa = 0;
  const referralRate = Number(settings.referral_commission_percent ?? 10);

  if (paymentType === "registration" && studentId && referralRate > 0) {
    const { data: referral } = await admin
      .from("referrals")
      .select("inviter_id")
      .eq("invited_user_id", studentId)
      .eq("status", "joined")
      .limit(1)
      .maybeSingle();

    // Un parrain ne peut pas se parrainer lui-même.
    if (referral?.inviter_id && referral.inviter_id !== studentId) {
      referrerId = referral.inviter_id;
      referralAmountFcfa = Math.round((grossAmountFcfa * referralRate) / 100);
    }
  }

  return {
    grossAmountFcfa,
    platformCommissionFcfa,
    referralAmountFcfa,
    referralRatePercent: referralRate,
    referrerId,
    sellerAmountFcfa: grossAmountFcfa - platformCommissionFcfa - referralAmountFcfa,
    ratePercent: rate,
  };
}
