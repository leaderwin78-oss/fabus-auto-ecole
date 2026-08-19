import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const TYPE_LABEL: Record<string, string> = {
  driving_session: "Séance de conduite",
  video_course: "Cours en visioconférence",
  exam: "Examen",
  other: "Rendez-vous",
};

const STATUS_BADGE: Record<string, string> = {
  scheduled: "badge-info",
  confirmed: "",
  canceled: "badge-danger",
  completed: "badge-muted",
  no_show: "badge-warning",
};

export default async function StudentCalendarPage() {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const { data: appointments } = await supabase
    .from("appointments")
    .select("*, instructor:instructor_id(full_name)")
    .eq("student_id", userId)
    .order("start_time", { ascending: true });

  const now = new Date();
  const upcoming = (appointments ?? []).filter((a) => new Date(a.end_time) >= now);
  const past = (appointments ?? []).filter((a) => new Date(a.end_time) < now);

  function renderList(list: typeof upcoming) {
    if (list.length === 0) return <div className="card empty-state"><p className="mb-0">Rien ici pour l&apos;instant.</p></div>;
    return (
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr><th>Type</th><th>Titre</th><th>Date</th><th>Moniteur</th><th>Statut</th></tr>
          </thead>
          <tbody>
            {list.map((a) => {
              const instructor = Array.isArray(a.instructor) ? a.instructor[0] : a.instructor;
              return (
                <tr key={a.id}>
                  <td>{TYPE_LABEL[a.type] ?? a.type}</td>
                  <td>{a.title}</td>
                  <td>{new Date(a.start_time).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td>{instructor?.full_name ?? "—"}</td>
                  <td><span className={`badge ${STATUS_BADGE[a.status] ?? ""}`}>{a.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <>
      <h3 className="mb-4">À venir</h3>
      <div className="mb-8">{renderList(upcoming)}</div>
      <h3 className="mb-4">Historique</h3>
      {renderList(past)}
    </>
  );
}
