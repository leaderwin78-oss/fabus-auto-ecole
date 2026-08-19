"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addQuizQuestion } from "@/lib/actions/quizzes";

export function AddQuestionForm({ quizId }: { quizId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [correctIndex, setCorrectIndex] = useState(0);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card">
      <h4 className="mb-4" style={{ fontSize: "1.1rem" }}>Ajouter une question</h4>
      {error && <div className="form-error-banner">{error}</div>}
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            formData.set("correct_index", String(correctIndex));
            const result = await addQuizQuestion(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else {
              formRef.current?.reset();
              setCorrectIndex(0);
              router.refresh();
            }
          })
        }
      >
        <input type="hidden" name="quiz_id" value={quizId} />
        <div className="field">
          <label>Question</label>
          <textarea name="question_text" required rows={2} />
        </div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="field" style={{ flexDirection: "row", alignItems: "center", gap: "0.75rem" }}>
            <input
              type="radio"
              name="correct_radio"
              checked={correctIndex === i}
              onChange={() => setCorrectIndex(i)}
              style={{ width: "auto" }}
            />
            <input name="options" placeholder={`Réponse ${i + 1}${i < 2 ? " (requise)" : " (optionnelle)"}`} required={i < 2} style={{ flex: 1 }} />
          </div>
        ))}
        <p className="text-sm text-muted-color mb-4">Cochez le bouton radio devant la bonne réponse.</p>
        <button type="submit" className="btn btn-primary w-full" disabled={isPending}>{isPending ? "..." : "Ajouter la question"}</button>
      </form>
    </div>
  );
}
