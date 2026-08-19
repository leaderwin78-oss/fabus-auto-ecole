import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AddQuestionForm } from "./AddQuestionForm";

export default async function AdminQuizDetailPage({ params }: { params: Promise<{ quizId: string }> }) {
  const { quizId } = await params;
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data: quiz } = await supabase.from("quizzes").select("*").eq("id", quizId).eq("organization_id", profile.organization_id ?? "").single();
  if (!quiz) notFound();

  const { data: questions } = await supabase
    .from("quiz_questions")
    .select("*, quiz_answers(*)")
    .eq("quiz_id", quizId)
    .order("position", { ascending: true });

  return (
    <>
      <Link href="/admin/quizzes" className="text-sm text-muted-color mb-4" style={{ display: "inline-block" }}>
        <i className="fa-solid fa-arrow-left"></i> Retour aux quiz
      </Link>
      <h2 className="mb-8">{quiz.title}</h2>

      {(questions ?? []).length === 0 ? (
        <div className="card empty-state mb-8"><p className="mb-0">Aucune question pour l&apos;instant.</p></div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }} className="mb-8">
          {(questions ?? []).map((q, i) => (
            <div key={q.id} className="card card-flat">
              <p className="mb-2" style={{ fontWeight: 600 }}>{i + 1}. {q.question_text}</p>
              <ul style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
                {(q.quiz_answers ?? [])
                  .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
                  .map((a: { id: string; answer_text: string; is_correct: boolean }) => (
                    <li key={a.id} className="text-sm" style={{ color: a.is_correct ? "var(--success)" : "var(--text-secondary)" }}>
                      {a.is_correct ? <i className="fa-solid fa-check" style={{ marginRight: 6 }}></i> : null}
                      {a.answer_text}
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <AddQuestionForm quizId={quizId} />
    </>
  );
}
