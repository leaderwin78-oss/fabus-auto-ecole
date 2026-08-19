"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createChapter } from "@/lib/actions/courses";

export function CreateChapterForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card">
      <h4 className="mb-4" style={{ fontSize: "1rem" }}>Ajouter un chapitre</h4>
      {error && <div className="form-error-banner">{error}</div>}
      <form
        ref={formRef}
        className="flex gap-2"
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            const result = await createChapter(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else {
              formRef.current?.reset();
              router.refresh();
            }
          })
        }
      >
        <input type="hidden" name="course_id" value={courseId} />
        <input name="title" required placeholder="Ex: Les intersections" style={{ flex: 1, padding: "0.75rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }} />
        <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "..." : "Ajouter"}</button>
      </form>
    </div>
  );
}
