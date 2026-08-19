import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function InstructorStudentsPage() {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const { data: appointments } = await supabase
    .from("appointments")
    .select("student_id, status, student:student_id(id, full_name, phone)")
    .eq("instructor_id", userId)
    .not("student_id", "is", null);

  const byStudent = new Map<string, { name: string; phone: string | null; total: number; completed: number }>();
  for (const a of appointments ?? []) {
    const student = Array.isArray(a.student) ? a.student[0] : a.student;
    if (!student) continue;
    const entry = byStudent.get(student.id) ?? { name: student.full_name, phone: student.phone, total: 0, completed: 0 };
    entry.total += 1;
    if (a.status === "completed") entry.completed += 1;
    byStudent.set(student.id, entry);
  }

  const students = Array.from(byStudent.entries());

  return (
    <>
      <h3 className="mb-4">Mes élèves</h3>
      {students.length === 0 ? (
        <div className="card empty-state"><p className="mb-0">Aucun élève associé pour l&apos;instant.</p></div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead><tr><th>Nom</th><th>Téléphone</th><th>Séances planifiées</th><th>Séances effectuées</th></tr></thead>
            <tbody>
              {students.map(([id, s]) => (
                <tr key={id}>
                  <td>{s.name}</td>
                  <td>{s.phone ?? "—"}</td>
                  <td>{s.total}</td>
                  <td>{s.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
