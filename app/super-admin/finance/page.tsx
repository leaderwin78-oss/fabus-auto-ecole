import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsForm } from "./SettingsForm";

export default async function FinanceDashboardPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "super_admin") redirect("/login");

  const admin = createAdminClient();
  const [{ data: settings }, { data: payments }] = await Promise.all([
    admin.from("platform_settings").select("*").eq("id", true).single(),
    admin
      .from("payments")
      .select("*, organizations(name)")
      .eq("status", "success")
      .order("paid_at", { ascending: false })
      .limit(200),
  ]);

  const totalGross = (payments ?? []).reduce((s, p) => s + (p.gross_amount_fcfa ?? p.amount_fcfa), 0);
  const totalCommission = (payments ?? []).reduce((s, p) => s + (p.platform_commission_fcfa ?? 0), 0);
  const totalNetToSchools = (payments ?? []).reduce((s, p) => s + (p.seller_amount_fcfa ?? 0), 0);

  const byType = new Map<string, { count: number; commission: number }>();
  for (const p of payments ?? []) {
    const entry = byType.get(p.payment_type) ?? { count: 0, commission: 0 };
    entry.count += 1;
    entry.commission += p.platform_commission_fcfa ?? 0;
    byType.set(p.payment_type, entry);
  }

  return (
    <>
      <div className="grid grid-cols-4 mb-8">
        <div className="card stat-tile">
          <div className="stat-value">{totalGross.toLocaleString("fr-FR")} F</div>
          <div className="stat-label">Volume total traité</div>
        </div>
        <div className="card stat-tile">
          <div className="stat-value" style={{ color: "var(--accent-text)" }}>{totalCommission.toLocaleString("fr-FR")} F</div>
          <div className="stat-label">Revenus plateforme</div>
        </div>
        <div className="card stat-tile">
          <div className="stat-value">{totalNetToSchools.toLocaleString("fr-FR")} F</div>
          <div className="stat-label">Reversé aux auto-écoles</div>
        </div>
        <div className="card stat-tile">
          <div className="stat-value">{(payments ?? []).length}</div>
          <div className="stat-label">Transactions réglées</div>
        </div>
      </div>

      <div className="grid grid-cols-2">
        <div>
          <h3 className="mb-4">Revenus par type</h3>
          {byType.size === 0 ? (
            <div className="card empty-state"><p className="mb-0">Aucune transaction réglée.</p></div>
          ) : (
            <div className="table-wrap mb-8">
              <table className="data-table">
                <thead><tr><th>Type</th><th>Transactions</th><th>Commission plateforme</th></tr></thead>
                <tbody>
                  {Array.from(byType.entries()).map(([type, v]) => (
                    <tr key={type}><td>{type}</td><td>{v.count}</td><td>{v.commission.toLocaleString("fr-FR")} F</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="mb-4">Dernières transactions</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Auto-école</th><th>Type</th><th>Brut</th><th>Commission</th></tr></thead>
              <tbody>
                {(payments ?? []).slice(0, 30).map((p) => {
                  const org = Array.isArray(p.organizations) ? p.organizations[0] : p.organizations;
                  return (
                    <tr key={p.id}>
                      <td>{org?.name ?? "—"}</td>
                      <td>{p.payment_type}</td>
                      <td>{(p.gross_amount_fcfa ?? p.amount_fcfa).toLocaleString("fr-FR")} F</td>
                      <td>{(p.platform_commission_fcfa ?? 0).toLocaleString("fr-FR")} F</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h3 className="mb-4">Taux de commission & essai</h3>
          {settings && <SettingsForm settings={settings} />}
        </div>
      </div>
    </>
  );
}
