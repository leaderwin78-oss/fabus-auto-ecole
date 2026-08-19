"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createQuiz } from "@/lib/actions/quizzes";

export function CreateQuizForm({ courses }: { courses: { id: string; title: string }[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card">
      <h4 className="mb-4" style={{ fontSize: "1.1rem" }}>Nouveau quiz</h4>
      {error && <div className="form-error-banner">{error}</div>}
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            const result = await createQuiz(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else {
              formRef.current?.reset();
              router.refresh();
            }
          })
        }
      >
        <div className="field">
          <label>Titre</label>
          <input name="title" required placeholder="Ex: Examen blanc n°1" />
        </div>
        <div className="field">
          <label>Type</label>
          <select name="kind" defaultValue="quiz">
            <option value="quiz">Quiz (leçon)</option>
            <option value="mock_exam">Examen blanc</option>
          </select>
        </div>
        <div className="field">
          <label>Formation liée (optionnel)</label>
          <select name="course_id" defaultValue="">
            <option value="">Aucune</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Seuil de réussite (%)</label>
          <input name="pass_score_percent" type="number" min={1} max={100} defaultValue={80} />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={isPending}>{isPending ? "..." : "Créer le quiz"}</button>
      </form>
    </div>
  );
}
