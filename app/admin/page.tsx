import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardBanner } from "@/components/DashboardBanner";

export default async function AdminDashboardPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();
  const orgId = profile.organization_id ?? "";

  const [
    { count: studentCount },
    { count: instructorCount },
    { count: courseCount },
    { data: recentPayments },
    { count: upcomingSessions },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("role", "student"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("organization_id", orgId).eq("role", "instructor"),
    supabase.from("courses").select("id", { count: "exact", head: true }).eq("organization_id", orgId),
    supabase.from("payments").select("amount_fcfa, status, created_at").eq("organization_id", orgId).eq("status", "success").order("created_at", { ascending: false }).limit(100),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("organization_id", orgId).gte("start_time", new Date().toISOString()).in("status", ["scheduled", "confirmed"]),
  ]);

  const revenue = (recentPayments ?? []).reduce((sum, p) => sum + p.amount_fcfa, 0);

  return (
    <>
    <DashboardBanner
      title="Pilotage de votre auto-école"
      subtitle="Vos élèves, vos moniteurs, vos formations et vos recettes en un coup d'œil."
    />
    <div className="grid grid-cols-4 mb-8">
      <div className="card stat-tile">
        <div className="stat-value">{studentCount ?? 0}</div>
        <div className="stat-label">Élèves</div>
      </div>
      <div className="card stat-tile">
        <div className="stat-value">{instructorCount ?? 0}</div>
        <div className="stat-label">Moniteurs</div>
      </div>
      <div className="card stat-tile">
        <div className="stat-value">{courseCount ?? 0}</div>
        <div className="stat-label">Formations</div>
      </div>
      <div className="card stat-tile">
        <div className="stat-value">{upcomingSessions ?? 0}</div>
        <div className="stat-label">Séances à venir</div>
      </div>
      <div className="card stat-tile" style={{ gridColumn: "1 / -1" }}>
        <div className="stat-value" style={{ color: "var(--accent-text)" }}>{revenue.toLocaleString("fr-FR")} F CFA</div>
        <div className="stat-label">Chiffre d&apos;affaires encaissé</div>
      </div>
    </div>
    </>
  );
}
