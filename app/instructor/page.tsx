import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DashboardBanner } from "@/components/DashboardBanner";

export default async function InstructorDashboardPage() {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const [{ data: todaySessions }, { data: upcoming }, { count: totalStudents }, { count: completedCount }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, student:student_id(full_name)")
      .eq("instructor_id", userId)
      .gte("start_time", now.toISOString().slice(0, 10))
      .lte("start_time", endOfDay.toISOString())
      .order("start_time", { ascending: true }),
    supabase
      .from("appointments")
      .select("*, student:student_id(full_name)")
      .eq("instructor_id", userId)
      .in("status", ["scheduled", "confirmed"])
      .gte("start_time", now.toISOString())
      .order("start_time", { ascending: true })
      .limit(5),
    supabase.from("appointments").select("student_id", { count: "exact", head: true }).eq("instructor_id", userId).not("student_id", "is", null),
    supabase.from("appointments").select("id", { count: "exact", head: true }).eq("instructor_id", userId).eq("status", "completed"),
  ]);

  return (
    <>
      <DashboardBanner
        title="Votre journée de moniteur"
        subtitle="Vos séances du jour, vos élèves et votre planning à venir."
      />
      <div className="grid grid-cols-3 mb-8">
        <div className="card stat-tile">
          <div className="stat-value">{todaySessions?.length ?? 0}</div>
          <div className="stat-label">Séances aujourd&apos;hui</div>
        </div>
        <div className="card stat-tile">
          <div className="stat-value">{totalStudents ?? 0}</div>
          <div className="stat-label">Élèves suivis</div>
        </div>
        <div className="card stat-tile">
          <div className="stat-value">{completedCount ?? 0}</div>
          <div className="stat-label">Séances effectuées</div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h3 className="mb-0">Prochaines séances</h3>
        <Link href="/instructor/calendar" className="btn btn-primary btn-sm">Gérer le calendrier</Link>
      </div>

      {(upcoming ?? []).length === 0 ? (
        <div className="card empty-state"><p className="mb-0">Aucune séance à venir.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Titre</th><th>Élève</th><th>Date</th><th>Type</th></tr></thead>
            <tbody>
              {(upcoming ?? []).map((a) => {
                const student = Array.isArray(a.student) ? a.student[0] : a.student;
                return (
                  <tr key={a.id}>
                    <td>{a.title}</td>
                    <td>{student?.full_name ?? "—"}</td>
                    <td>{new Date(a.start_time).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td>{a.type}</td>
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
