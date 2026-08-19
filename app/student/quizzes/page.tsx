import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function StudentQuizzesPage() {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const [{ data: quizzes }, { data: attempts }] = await Promise.all([
    supabase
      .from("quizzes")
      .select("*, courses(title)")
      .eq("organization_id", profile.organization_id ?? "")
      .eq("status", "published")
      .order("created_at", { ascending: false }),
    supabase.from("quiz_attempts").select("quiz_id, score_percent, attempted_at").eq("student_id", userId).order("attempted_at", { ascending: false }),
  ]);

  const bestByQuiz = new Map<string, number>();
  for (const a of attempts ?? []) {
    const current = bestByQuiz.get(a.quiz_id) ?? -1;
    if (a.score_percent > current) bestByQuiz.set(a.quiz_id, a.score_percent);
  }

  return (
    <>
      <h3 className="mb-4">Quiz et examens blancs</h3>
      {(quizzes ?? []).length === 0 ? (
        <div className="card empty-state"><p className="mb-0">Aucun quiz disponible pour l&apos;instant.</p></div>
      ) : (
        <div className="grid grid-cols-3">
          {(quizzes ?? []).map((q) => {
            const course = Array.isArray(q.courses) ? q.courses[0] : q.courses;
            const best = bestByQuiz.get(q.id);
            return (
              <Link key={q.id} href={`/student/quizzes/${q.id}`} className="card">
                <span className="badge mb-2">{q.kind === "mock_exam" ? "Examen blanc" : "Quiz"}</span>
                <h4 className="mb-2">{q.title}</h4>
                {course && <p className="text-sm text-muted-color mb-2">{course.title}</p>}
                <p className="text-sm text-muted-color mb-0">
                  {best !== undefined ? `Meilleur score : ${best}% ${best >= q.pass_score_percent ? "✅" : ""}` : "Pas encore tenté"}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
