import Link from "next/link";
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

  const pending = (organizations ?? []).filter((o) => o.status === "pending");
  const others = (organizations ?? []).filter((o) => o.status !== "pending");

  return (
    <div className="grid grid-cols-2" style={{ gridTemplateColumns: "1fr 360px", alignItems: "start" }}>
      <div>
        {pending.length > 0 && (
          <>
            <h3 className="mb-4">Demandes en attente ({pending.length})</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }} className="mb-8">
              {pending.map((o) => (
                <Link key={o.id} href={`/super-admin/organizations/${o.id}`} className="card card-flat flex items-center justify-between">
                  <div>
                    <p className="mb-0" style={{ fontWeight: 600 }}>{o.name}</p>
                    <span className="text-sm text-muted-color">{o.city ?? "—"} • {o.responsable_name ?? "—"}</span>
                  </div>
                  <span className="badge badge-warning">En attente</span>
                </Link>
              ))}
            </div>
          </>
        )}

        <h3 className="mb-4">Toutes les auto-écoles</h3>
        {others.length === 0 ? (
          <div className="card empty-state"><p className="mb-0">Aucune autre auto-école.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Nom</th><th>Ville</th><th>Abonnement</th><th>Statut</th></tr></thead>
              <tbody>
                {others.map((o) => {
                  const subs = Array.isArray(o.subscriptions) ? o.subscriptions : [];
                  const planName = subs[0]?.plans ? (Array.isArray(subs[0].plans) ? subs[0].plans[0]?.name : subs[0].plans.name) : "—";
                  return (
                    <tr key={o.id}>
                      <td><Link href={`/super-admin/organizations/${o.id}`}>{o.name}</Link></td>
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
