import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CreateAppointmentForm } from "@/components/CreateAppointmentForm";
import { AppointmentRow } from "@/components/AppointmentRow";

export default async function InstructorCalendarPage() {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const [{ data: appointments }, { data: students }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, student:student_id(full_name)")
      .eq("instructor_id", userId)
      .order("start_time", { ascending: false }),
    supabase.from("profiles").select("id, full_name").eq("organization_id", profile.organization_id ?? "").eq("role", "student").order("full_name"),
  ]);

  return (
    <div className="grid grid-cols-2" style={{ gridTemplateColumns: "1fr 340px", alignItems: "start" }}>
      <div>
        <h3 className="mb-4">Mes séances</h3>
        {(appointments ?? []).length === 0 ? (
          <div className="card empty-state"><p className="mb-0">Aucune séance planifiée.</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {(appointments ?? []).map((a) => (
              <AppointmentRow key={a.id} appointment={a} canEdit canAddNote />
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="mb-4">Planifier une séance</h3>
        <CreateAppointmentForm students={students ?? []} instructors={[]} showInstructorField={false} />
      </div>
    </div>
  );
}
