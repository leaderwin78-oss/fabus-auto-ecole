import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CreateServiceForm } from "./CreateServiceForm";
import { ServiceRow } from "./ServiceRow";

export default async function InstructorServicesPage() {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const [{ data: services }, { data: bookings }] = await Promise.all([
    supabase.from("instructor_services").select("*").eq("instructor_id", userId).order("created_at", { ascending: false }),
    supabase.from("service_bookings").select("*, instructor_services(title), student:student_id(full_name)").eq("instructor_id", userId).order("created_at", { ascending: false }).limit(20),
  ]);

  return (
    <div className="grid grid-cols-2" style={{ gridTemplateColumns: "1fr 340px", alignItems: "start" }}>
      <div>
        <h3 className="mb-4">Mes prestations</h3>
        {(services ?? []).length === 0 ? (
          <div className="card empty-state mb-8"><p className="mb-0">Créez votre première prestation (ex: heure de conduite supplémentaire).</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }} className="mb-8">
            {(services ?? []).map((s) => <ServiceRow key={s.id} service={s} />)}
          </div>
        )}

        <h3 className="mb-4">Réservations récentes</h3>
        {(bookings ?? []).length === 0 ? (
          <div className="card empty-state"><p className="mb-0">Aucune réservation.</p></div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Élève</th><th>Prestation</th><th>Statut</th></tr></thead>
              <tbody>
                {(bookings ?? []).map((b) => {
                  const student = Array.isArray(b.student) ? b.student[0] : b.student;
                  const service = Array.isArray(b.instructor_services) ? b.instructor_services[0] : b.instructor_services;
                  return (
                    <tr key={b.id}>
                      <td>{student?.full_name ?? "—"}</td>
                      <td>{service?.title ?? "—"}</td>
                      <td><span className="badge">{b.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <CreateServiceForm />
    </div>
  );
}
