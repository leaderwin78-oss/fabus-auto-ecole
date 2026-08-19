import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data: org } = await supabase.from("organizations").select("*").eq("id", profile.organization_id ?? "").single();
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*, plans(name, price_fcfa, max_instructors, max_students)")
    .eq("organization_id", profile.organization_id ?? "")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const plan = subscription ? (Array.isArray(subscription.plans) ? subscription.plans[0] : subscription.plans) : null;

  return (
    <div className="grid grid-cols-2">
      <div>
        <h3 className="mb-4">Informations de l&apos;auto-école</h3>
        {org && <SettingsForm org={org} />}
      </div>
      <div>
        <h3 className="mb-4">Abonnement</h3>
        {subscription && plan ? (
          <div className="card">
            <h4 className="mb-2">{plan.name}</h4>
            <p className="text-muted-color mb-2">{plan.price_fcfa.toLocaleString("fr-FR")} F CFA / mois</p>
            <p className="text-sm mb-2">Statut : <span className="badge">{subscription.status}</span></p>
            <p className="text-sm text-muted-color mb-0">
              Échéance : {new Date(subscription.current_period_end).toLocaleDateString("fr-FR")}
            </p>
          </div>
        ) : (
          <div className="card empty-state"><p className="mb-0">Aucun abonnement actif.</p></div>
        )}
      </div>
    </div>
  );
}
