// Payment provider abstraction (section 14 of the product brief).
//
// Only "manual" is wired to something real today: an admin marks a payment as
// received (cash, bank transfer, or a Wave/Orange Money transfer confirmed by
// hand) and it's recorded in Postgres. Wave and Orange Money's merchant APIs
// require a business account + API keys that only the platform owner can
// provision — until those are supplied, this abstraction is what lets the
// rest of the app (schema, RLS, UI, payment_status lifecycle) stay unchanged
// when a real integration is added later. No fake "success" is ever returned
// for a provider that isn't actually configured.

export type ProviderId = "wave" | "orange_money" | "manual";

export interface InitiatePaymentInput {
  amountFcfa: number;
  studentId: string;
  organizationId: string;
  reference: string;
}

export interface InitiatePaymentResult {
  ok: boolean;
  redirectUrl?: string;
  message: string;
}

export interface PaymentProviderAdapter {
  id: ProviderId;
  isConfigured(): boolean;
  initiate(input: InitiatePaymentInput): Promise<InitiatePaymentResult>;
}

const manualProvider: PaymentProviderAdapter = {
  id: "manual",
  isConfigured: () => true,
  async initiate(input) {
    return {
      ok: true,
      message: `Paiement de ${input.amountFcfa.toLocaleString("fr-FR")} F CFA enregistré comme en attente. Un administrateur le validera après réception.`,
    };
  },
};

function unconfiguredProvider(id: ProviderId): PaymentProviderAdapter {
  return {
    id,
    isConfigured: () => false,
    async initiate() {
      return {
        ok: false,
        message: `${id === "wave" ? "Wave" : "Orange Money"} n'est pas encore configuré sur cette plateforme. Contactez votre auto-école pour payer autrement.`,
      };
    },
  };
}

export const paymentProviders: Record<ProviderId, PaymentProviderAdapter> = {
  manual: manualProvider,
  wave: unconfiguredProvider("wave"),
  orange_money: unconfiguredProvider("orange_money"),
};

export function getPaymentProvider(id: ProviderId): PaymentProviderAdapter {
  return paymentProviders[id];
}
