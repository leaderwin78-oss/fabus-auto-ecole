import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InviteStaffForm } from "@/components/InviteStaffForm";
import { RemoveStaffButton } from "@/components/RemoveStaffButton";

export default async function AdminInstructorsPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data: instructors } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", profile.organization_id ?? "")
    .eq("role", "instructor")
    .order("full_name");

  return (
    <div className="grid grid-cols-2" style={{ gridTemplateColumns: "1fr 340px", alignItems: "start" }}>
      <div>
        <h3 className="mb-4">Moniteurs</h3>
        {(instructors ?? []).length === 0 ? (
          <div className="card empty-state"><p className="mb-0">Aucun moniteur pour l&apos;instant.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Nom</th><th>Téléphone</th><th></th></tr></thead>
              <tbody>
                {(instructors ?? []).map((i) => (
                  <tr key={i.id}>
                    <td>{i.full_name}</td>
                    <td>{i.phone ?? "—"}</td>
                    <td><RemoveStaffButton userId={i.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <InviteStaffForm role="instructor" label="un moniteur" />
    </div>
  );
}
