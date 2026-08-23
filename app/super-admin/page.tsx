import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardBanner } from "@/components/DashboardBanner";

export default async function SuperAdminDashboardPage() {
  const { profile } = await requireProfile();
  // Defense in depth: middleware already restricts /super-admin/* to
  // super_admin, but this page uses the service-role client for a
  // cross-tenant rollup query (RLS is per-organization by design and can't
  // express "sum across every tenant"), so the role check is re-asserted
  // here rather than trusted solely from the routing layer.
  if (profile.role !== "super_admin") redirect("/login");
  const admin = createAdminClient();

  const [{ count: orgCount }, { count: studentCount }, { count: instructorCount }, { data: revenuePayments }, { count: activeSubs }] =
    await Promise.all([
      admin.from("organizations").select("id", { count: "exact", head: true }),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
      admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "instructor"),
      admin.from("payments").select("amount_fcfa").eq("status", "success"),
      admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);

  const revenue = (revenuePayments ?? []).reduce((sum, p) => sum + p.amount_fcfa, 0);

  return (
    <>
    <DashboardBanner
      variant="super_admin"
      title="Vue d'ensemble de la plateforme"
      subtitle="Auto-écoles, utilisateurs, abonnements et recettes, toutes écoles confondues."
    />
    <div className="grid grid-cols-4">
      <div className="card stat-tile">
        <div className="stat-value">{orgCount ?? 0}</div>
        <div className="stat-label">Auto-écoles</div>
      </div>
      <div className="card stat-tile">
        <div className="stat-value">{studentCount ?? 0}</div>
        <div className="stat-label">Élèves (toutes écoles)</div>
      </div>
      <div className="card stat-tile">
        <div className="stat-value">{instructorCount ?? 0}</div>
        <div className="stat-label">Moniteurs</div>
      </div>
      <div className="card stat-tile">
        <div className="stat-value">{activeSubs ?? 0}</div>
        <div className="stat-label">Abonnements actifs</div>
      </div>
      <div className="card stat-tile" style={{ gridColumn: "1 / -1" }}>
        <div className="stat-value" style={{ color: "var(--fabus-green)" }}>{revenue.toLocaleString("fr-FR")} F CFA</div>
        <div className="stat-label">Chiffre d&apos;affaires plateforme (tous paiements réussis)</div>
      </div>
    </div>
    </>
  );
}
