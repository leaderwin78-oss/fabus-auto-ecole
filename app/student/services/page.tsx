import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { BookServiceButton } from "./BookServiceButton";

export default async function StudentServicesPage() {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const [{ data: services }, { data: myBookings }] = await Promise.all([
    supabase.from("instructor_services").select("*, instructor:instructor_id(full_name)").eq("organization_id", profile.organization_id ?? "").eq("is_active", true).order("price_fcfa"),
    supabase.from("service_bookings").select("*, instructor_services(title)").eq("student_id", userId).order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <h3 className="mb-4">Prestations supplémentaires</h3>
      {(services ?? []).length === 0 ? (
        <div className="card empty-state mb-8"><p className="mb-0">Aucune prestation disponible pour l&apos;instant.</p></div>
      ) : (
        <div className="grid grid-cols-3 mb-8">
          {(services ?? []).map((s) => {
            const instructor = Array.isArray(s.instructor) ? s.instructor[0] : s.instructor;
            return (
              <div key={s.id} className="card" style={{ display: "flex", flexDirection: "column" }}>
                <h4 className="mb-1">{s.title}</h4>
                <p className="text-sm text-muted-color mb-2">Par {instructor?.full_name}</p>
                <p className="text-muted-color mb-4" style={{ flex: 1 }}>{s.description}</p>
                <p className="font-bold mb-4">{s.price_fcfa.toLocaleString("fr-FR")} F CFA{s.duration_minutes ? ` — ${s.duration_minutes} min` : ""}</p>
                <BookServiceButton serviceId={s.id} />
              </div>
            );
          })}
        </div>
      )}

      <h3 className="mb-4">Mes réservations</h3>
      {(myBookings ?? []).length === 0 ? (
        <div className="card empty-state"><p className="mb-0">Aucune réservation.</p></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {(myBookings ?? []).map((b) => {
            const service = Array.isArray(b.instructor_services) ? b.instructor_services[0] : b.instructor_services;
            return (
              <div key={b.id} className="card card-flat flex items-center justify-between">
                <span>{service?.title}</span>
                <span className="badge">{b.status}</span>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
