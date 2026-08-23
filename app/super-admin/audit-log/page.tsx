import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AuditLogPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "super_admin") redirect("/login");

  const admin = createAdminClient();
  const { data: logs } = await admin
    .from("activity_logs")
    .select("*, actor:actor_id(full_name), organizations(name)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <>
      <h3 className="mb-4">Journal d&apos;activité</h3>
      {(logs ?? []).length === 0 ? (
        <div className="card empty-state"><p className="mb-0">Aucune activité enregistrée.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Date</th><th>Acteur</th><th>Auto-école</th><th>Action</th></tr></thead>
            <tbody>
              {(logs ?? []).map((l) => {
                const actor = Array.isArray(l.actor) ? l.actor[0] : l.actor;
                const org = Array.isArray(l.organizations) ? l.organizations[0] : l.organizations;
                return (
                  <tr key={l.id}>
                    <td>{new Date(l.created_at).toLocaleString("fr-FR")}</td>
                    <td>{actor?.full_name ?? "Système"}</td>
                    <td>{org?.name ?? "—"}</td>
                    <td>{l.action}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
