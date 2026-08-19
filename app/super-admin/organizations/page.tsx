import { requireProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { CreateOrganizationForm } from "./CreateOrganizationForm";
import { OrgStatusSelect } from "./OrgStatusSelect";

export default async function SuperAdminOrganizationsPage() {
  const { profile } = await requireProfile();
  if (profile.role !== "super_admin") redirect("/login");

  const admin = createAdminClient();
  const [{ data: organizations }, { data: plans }] = await Promise.all([
    admin.from("organizations").select("*, subscriptions(status, plans(name))").order("created_at", { ascending: false }),
    admin.from("plans").select("*").eq("is_active", true).order("price_fcfa"),
  ]);

  return (
    <div className="grid grid-cols-2" style={{ gridTemplateColumns: "1fr 360px", alignItems: "start" }}>
      <div>
        <h3 className="mb-4">Auto-écoles</h3>
        {(organizations ?? []).length === 0 ? (
          <div className="card empty-state"><p className="mb-0">Aucune auto-école pour l&apos;instant.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Nom</th><th>Ville</th><th>Abonnement</th><th>Statut</th></tr></thead>
              <tbody>
                {(organizations ?? []).map((o) => {
                  const subs = Array.isArray(o.subscriptions) ? o.subscriptions : [];
                  const planName = subs[0]?.plans ? (Array.isArray(subs[0].plans) ? subs[0].plans[0]?.name : subs[0].plans.name) : "—";
                  return (
                    <tr key={o.id}>
                      <td>{o.name}</td>
                      <td>{o.city ?? "—"}</td>
                      <td>{planName}</td>
                      <td><OrgStatusSelect orgId={o.id} status={o.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <CreateOrganizationForm plans={plans ?? []} />
    </div>
  );
}
