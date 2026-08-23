import type { SupabaseClient } from "@supabase/supabase-js";

export type PaymentType = "registration" | "course" | "extra_service" | "subscription" | "other";

export interface CommissionBreakdown {
  grossAmountFcfa: number;
  platformCommissionFcfa: number;
  sellerAmountFcfa: number;
  ratePercent: number;
}

// The only place commission/fee percentages are read and applied — always
// server-side, at settlement time, never trusted from the client (section 8
// of the brief: "Ne jamais calculer uniquement côté frontend").
export async function computeCommission(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  paymentType: PaymentType,
  grossAmountFcfa: number
): Promise<CommissionBreakdown> {
  const { data: settings } = await supabase.from("platform_settings").select("*").eq("id", true).single();

  const rate =
    paymentType === "course"
      ? Number(settings?.course_platform_commission_percent ?? 20)
      : paymentType === "registration"
      ? Number(settings?.registration_platform_fee_percent ?? 5)
      : paymentType === "extra_service"
      ? Number(settings?.extra_service_commission_percent ?? 20)
      : 0;

  const platformCommissionFcfa = Math.round((grossAmountFcfa * rate) / 100);
  return {
    grossAmountFcfa,
    platformCommissionFcfa,
    sellerAmountFcfa: grossAmountFcfa - platformCommissionFcfa,
    ratePercent: rate,
  };
}
