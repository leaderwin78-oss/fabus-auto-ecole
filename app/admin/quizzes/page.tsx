import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CreateQuizForm } from "./CreateQuizForm";
import { QuizStatusSelect } from "./QuizStatusSelect";

export default async function AdminQuizzesPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const [{ data: quizzes }, { data: courses }] = await Promise.all([
    supabase.from("quizzes").select("*, courses(title)").eq("organization_id", profile.organization_id ?? "").order("created_at", { ascending: false }),
    supabase.from("courses").select("id, title").eq("organization_id", profile.organization_id ?? "").order("title"),
  ]);

  return (
    <div className="grid grid-cols-2" style={{ gridTemplateColumns: "1fr 340px", alignItems: "start" }}>
      <div>
        <h3 className="mb-4">Quiz et examens blancs</h3>
        {(quizzes ?? []).length === 0 ? (
          <div className="card empty-state"><p className="mb-0">Créez votre premier quiz.</p></div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {(quizzes ?? []).map((q) => {
              const course = Array.isArray(q.courses) ? q.courses[0] : q.courses;
              return (
                <div key={q.id} className="card card-flat flex items-center justify-between">
                  <div>
                    <Link href={`/admin/quizzes/${q.id}`} style={{ fontWeight: 600 }}>{q.title}</Link>
                    <div className="text-sm text-muted-color">
                      {q.kind === "mock_exam" ? "Examen blanc" : "Quiz"} {course ? `• ${course.title}` : ""} • seuil {q.pass_score_percent}%
                    </div>
                  </div>
                  <QuizStatusSelect quizId={q.id} status={q.status} />
                </div>
              );
            })}
          </div>
        )}
      </div>
      <CreateQuizForm courses={courses ?? []} />
    </div>
  );
}
