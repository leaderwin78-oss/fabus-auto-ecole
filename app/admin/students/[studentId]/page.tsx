import { notFound } from "next/navigation";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DocumentReviewRow } from "./DocumentReviewRow";

export default async function StudentDetailPage({ params }: { params: Promise<{ studentId: string }> }) {
  const { studentId } = await params;
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", studentId)
    .eq("organization_id", profile.organization_id ?? "")
    .single();
  if (!student) notFound();

  const [{ data: documents }, { data: enrollments }, { data: payments }] = await Promise.all([
    supabase.from("documents").select("*").eq("owner_id", studentId).order("created_at", { ascending: false }),
    supabase.from("enrollments").select("*, courses(title)").eq("student_id", studentId),
    supabase.from("payments").select("*").eq("student_id", studentId).order("created_at", { ascending: false }),
  ]);

  return (
    <>
      <Link href="/admin/students" className="text-sm text-muted-color mb-4" style={{ display: "inline-block" }}>
        <i className="fa-solid fa-arrow-left"></i> Retour
      </Link>
      <h2 className="mb-8">{student.full_name}</h2>

      <div className="grid grid-cols-2">
        <div>
          <h3 className="mb-4">Dossier administratif</h3>
          {(documents ?? []).length === 0 ? (
            <div className="card empty-state"><p className="mb-0">Aucun document envoyé.</p></div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {(documents ?? []).map((d) => <DocumentReviewRow key={d.id} document={d} />)}
            </div>
          )}

          <h3 className="mt-8 mb-4">Formations</h3>
          {(enrollments ?? []).length === 0 ? (
            <div className="card empty-state"><p className="mb-0">Aucune inscription.</p></div>
          ) : (
            <ul style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {(enrollments ?? []).map((e) => {
                const course = Array.isArray(e.courses) ? e.courses[0] : e.courses;
                return <li key={e.id} className="card card-flat">{course?.title} — {e.status}</li>;
              })}
            </ul>
          )}
        </div>

        <div>
          <h3 className="mb-4">Paiements</h3>
          {(payments ?? []).length === 0 ? (
            <div className="card empty-state"><p className="mb-0">Aucun paiement.</p></div>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Montant</th><th>Statut</th></tr></thead>
                <tbody>
                  {(payments ?? []).map((p) => (
                    <tr key={p.id}>
                      <td>{new Date(p.created_at).toLocaleDateString("fr-FR")}</td>
                      <td>{p.amount_fcfa.toLocaleString("fr-FR")} F</td>
                      <td><span className="badge">{p.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
