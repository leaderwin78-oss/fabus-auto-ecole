import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { InviteStaffForm } from "@/components/InviteStaffForm";
import { RemoveStaffButton } from "@/components/RemoveStaffButton";
import { ApplicationRow } from "./ApplicationRow";
import type { Profile } from "@/types/database";

export default async function AdminInstructorsPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data: instructors } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", profile.organization_id ?? "")
    .eq("role", "instructor")
    .order("full_name");

  const all = (instructors ?? []) as Profile[];
  // Self-registered moniteurs awaiting a decision (lib/actions/signup.ts).
  const pending = all.filter((i) => i.status === "pending");
  const active = all.filter((i) => i.status === "active");
  const rejected = all.filter((i) => i.status === "rejected");
  const isOwner = profile.role === "admin";

  return (
    <div className="grid grid-cols-2" style={{ gridTemplateColumns: "1fr 340px", alignItems: "start" }}>
      <div>
        {pending.length > 0 && (
          <section className="mb-8">
            <h3 className="mb-4">
              Candidatures à examiner{" "}
              <span className="badge badge-warning">{pending.length}</span>
            </h3>
            {isOwner ? (
              pending.map((i) => (
                <ApplicationRow
                  key={i.id}
                  userId={i.id}
                  fullName={i.full_name}
                  phone={i.phone}
                  licenseNumber={i.license_number}
                  yearsExperience={i.years_experience}
                  categories={i.teaching_categories ?? []}
                  bio={i.bio}
                />
              ))
            ) : (
              <div className="card empty-state">
                <p className="mb-0">
                  {pending.length} candidature(s) en attente. Seul le responsable de l&apos;auto-école peut les valider.
                </p>
              </div>
            )}
          </section>
        )}

        <h3 className="mb-4">Moniteurs</h3>
        {active.length === 0 ? (
          <div className="card empty-state"><p className="mb-0">Aucun moniteur actif pour l&apos;instant.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Nom</th><th>Téléphone</th><th>Catégories</th><th></th></tr></thead>
              <tbody>
                {active.map((i) => (
                  <tr key={i.id}>
                    <td>{i.full_name}</td>
                    <td>{i.phone ?? "—"}</td>
                    <td>{(i.teaching_categories ?? []).join(", ") || "—"}</td>
                    <td><RemoveStaffButton userId={i.id} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {rejected.length > 0 && (
          <section className="mt-8">
            <h4 className="mb-4 text-muted-color">Candidatures refusées</h4>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Nom</th><th>Motif</th><th></th></tr></thead>
                <tbody>
                  {rejected.map((i) => (
                    <tr key={i.id}>
                      <td>{i.full_name}</td>
                      <td>{i.rejection_reason ?? "—"}</td>
                      <td><RemoveStaffButton userId={i.id} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
      <InviteStaffForm role="instructor" label="un moniteur" />
    </div>
  );
}
