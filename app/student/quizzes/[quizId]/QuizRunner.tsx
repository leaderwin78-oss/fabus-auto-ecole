"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getQuizForTaking, submitQuizAttempt, type QuizForTaking, type QuizAttemptResult } from "@/lib/actions/quizzes";

export function QuizRunner({ quizId }: { quizId: string }) {
  const [quiz, setQuiz] = useState<QuizForTaking | null | undefined>(undefined);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getQuizForTaking(quizId)
      .then(setQuiz)
      .catch((err) => setError(err.message ?? "Impossible de charger le quiz."));
  }, [quizId]);

  if (error) return <div className="form-error-banner">{error}</div>;
  if (quiz === undefined) return <p className="text-muted-color">Chargement...</p>;
  if (quiz === null) return <div className="card empty-state"><p className="mb-0">Quiz introuvable.</p></div>;

  async function handleSubmit() {
    if (!quiz) return;
    setSubmitting(true);
    setError(null);
    const res = await submitQuizAttempt(quiz.id, answers);
    setSubmitting(false);
    if (!res.ok) setError(res.error);
    else setResult(res.result);
  }

  if (result) {
    return (
      <div className="card text-center" style={{ maxWidth: 480, margin: "0 auto" }}>
        <div className="icon-box" style={{ margin: "0 auto 1.5rem", background: result.passed ? undefined : "rgba(239,68,68,0.1)", color: result.passed ? undefined : "var(--danger)" }}>
          <i className={`fa-solid ${result.passed ? "fa-circle-check" : "fa-circle-xmark"}`}></i>
        </div>
        <h2 className="mb-2">{result.passed ? "Réussi !" : "Pas encore"}</h2>
        <p className="text-muted-color mb-4">{result.correct_count} / {result.total} bonnes réponses</p>
        <div className="progress-container mb-8">
          <div className="progress-bar" style={{ width: `${result.score_percent}%`, background: result.passed ? undefined : "var(--danger)" }}></div>
        </div>
        <p className="mb-8" style={{ fontWeight: 700, fontSize: "1.5rem" }}>{result.score_percent}%</p>
        <Link href="/student/quizzes" className="btn btn-secondary">Retour aux quiz</Link>
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;

  return (
    <>
      <Link href="/student/quizzes" className="text-sm text-muted-color mb-4" style={{ display: "inline-block" }}>
        <i className="fa-solid fa-arrow-left"></i> Retour
      </Link>
      <h2 className="mb-8">{quiz.title}</h2>

      {error && <div className="form-error-banner">{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {quiz.questions.map((q, i) => (
          <div key={q.id} className="card">
            <p className="mb-4" style={{ fontWeight: 600 }}>{i + 1}. {q.question_text}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {q.answers.map((a) => (
                <label key={a.id} className="flex items-center gap-2" style={{ cursor: "pointer", padding: "0.5rem 0" }}>
                  <input
                    type="radio"
                    name={`question-${q.id}`}
                    checked={answers[q.id] === a.id}
                    onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: a.id }))}
                  />
                  {a.answer_text}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        className="btn btn-primary w-full mt-8"
        disabled={submitting || answeredCount < quiz.questions.length}
        onClick={handleSubmit}
      >
        {submitting ? "Envoi..." : `Valider (${answeredCount}/${quiz.questions.length})`}
      </button>
    </>
  );
}
