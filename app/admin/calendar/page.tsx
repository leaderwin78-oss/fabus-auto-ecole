import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CreateAppointmentForm } from "@/components/CreateAppointmentForm";
import { AppointmentRow } from "@/components/AppointmentRow";

export default async function AdminCalendarPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();
  const orgId = profile.organization_id ?? "";

  const [{ data: appointments }, { data: students }, { data: instructors }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, student:student_id(full_name), instructor:instructor_id(full_name)")
      .eq("organization_id", orgId)
      .order("start_time", { ascending: false })
      .limit(50),
    supabase.from("profiles").select("id, full_name").eq("organization_id", orgId).eq("role", "student").order("full_name"),
    supabase.from("profiles").select("id, full_name").eq("organization_id", orgId).eq("role", "instructor").order("full_name"),
  ]);

  return (
    <div className="grid grid-cols-2" style={{ gridTemplateColumns: "1fr 340px", alignItems: "start" }}>
      <div>
        <h3 className="mb-4">Calendrier de l&apos;auto-école</h3>
        {(appointments ?? []).length === 0 ? (
          <div className="card empty-state"><p className="mb-0">Aucune séance planifiée.</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {(appointments ?? []).map((a) => (
              <AppointmentRow key={a.id} appointment={a} canEdit />
            ))}
          </div>
        )}
      </div>
      <div>
        <h3 className="mb-4">Planifier</h3>
        <CreateAppointmentForm students={students ?? []} instructors={instructors ?? []} showInstructorField />
      </div>
    </div>
  );
}
