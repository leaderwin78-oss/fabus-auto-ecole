import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InviteStaffForm } from "@/components/InviteStaffForm";

export default async function AdminStudentsPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data: students } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", profile.organization_id ?? "")
    .eq("role", "student")
    .order("full_name");

  const { data: pendingDocs } = await supabase
    .from("documents")
    .select("owner_id", { count: "exact" })
    .eq("organization_id", profile.organization_id ?? "")
    .eq("status", "submitted");

  const pendingByOwner = new Set((pendingDocs ?? []).map((d) => d.owner_id));

  return (
    <div className="grid grid-cols-2" style={{ gridTemplateColumns: "1fr 340px", alignItems: "start" }}>
      <div>
        <h3 className="mb-4">Élèves</h3>
        {(students ?? []).length === 0 ? (
          <div className="card empty-state"><p className="mb-0">Aucun élève pour l&apos;instant.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Nom</th><th>Téléphone</th><th>Dossier</th><th></th></tr></thead>
              <tbody>
                {(students ?? []).map((s) => (
                  <tr key={s.id}>
                    <td>{s.full_name}</td>
                    <td>{s.phone ?? "—"}</td>
                    <td>{pendingByOwner.has(s.id) ? <span className="badge badge-info">À valider</span> : <span className="badge badge-muted">—</span>}</td>
                    <td><Link href={`/admin/students/${s.id}`} className="btn btn-secondary btn-sm">Voir</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <InviteStaffForm role="student" label="un élève" />
    </div>
  );
}
