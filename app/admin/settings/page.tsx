import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";
import { InviteStaffForm } from "@/components/InviteStaffForm";
import { RemoveStaffButton } from "@/components/RemoveStaffButton";

export default async function AdminSettingsPage() {
  const { profile } = await requireProfile();
  const isOwner = profile.role === "admin";
  const supabase = await createClient();

  const [{ data: org }, { data: subscription }, { data: staff }] = await Promise.all([
    supabase.from("organizations").select("*").eq("id", profile.organization_id ?? "").single(),
    supabase
      .from("subscriptions")
      .select("*, plans(name, price_fcfa, max_instructors, max_students)")
      .eq("organization_id", profile.organization_id ?? "")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    isOwner
      ? supabase.from("profiles").select("*").eq("organization_id", profile.organization_id ?? "").eq("role", "admin_auto_ecole").order("full_name")
      : Promise.resolve({ data: [] as { id: string; full_name: string; phone: string | null }[] }),
  ]);

  const plan = subscription ? (Array.isArray(subscription.plans) ? subscription.plans[0] : subscription.plans) : null;

  return (
    <div className="grid grid-cols-2">
      <div>
        <h3 className="mb-4">Informations de l&apos;auto-école</h3>
        {isOwner ? (
          org && <SettingsForm org={org} />
        ) : (
          <div className="card empty-state"><p className="mb-0">Seul le propriétaire de l&apos;auto-école peut modifier ces informations.</p></div>
        )}

        {isOwner && (
          <>
            <h3 className="mt-8 mb-4">Personnel administratif</h3>
            {(staff ?? []).length === 0 ? (
              <div className="card empty-state"><p className="mb-0">Aucun administrateur délégué.</p></div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {(staff ?? []).map((s) => (
                  <div key={s.id} className="card card-flat flex items-center justify-between">
                    <span>{s.full_name}</span>
                    <RemoveStaffButton userId={s.id} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <div>
        <h3 className="mb-4">Abonnement</h3>
        {subscription && plan ? (
          <div className="card mb-4">
            <h4 className="mb-2">{plan.name}</h4>
            <p className="text-muted-color mb-2">{plan.price_fcfa.toLocaleString("fr-FR")} F CFA / mois</p>
            <p className="text-sm mb-2">Statut : <span className="badge">{subscription.status}</span></p>
            <p className="text-sm text-muted-color mb-0">
              Échéance : {new Date(subscription.current_period_end).toLocaleDateString("fr-FR")}
            </p>
          </div>
        ) : (
          <div className="card empty-state mb-4"><p className="mb-0">Aucun abonnement actif.</p></div>
        )}

        {isOwner && <InviteStaffForm role="admin_auto_ecole" label="un administrateur délégué" />}
      </div>
    </div>
  );
}
