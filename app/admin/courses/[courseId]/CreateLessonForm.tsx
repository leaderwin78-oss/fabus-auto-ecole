"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createLesson } from "@/lib/actions/courses";

export function CreateLessonForm({ chapterId, courseId }: { chapterId: string; courseId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentType, setContentType] = useState("text");
  const [isPending, startTransition] = useTransition();

  if (!open) {
    return (
      <button className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>
        <i className="fa-solid fa-plus"></i> Ajouter une leçon
      </button>
    );
  }

  return (
    <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
      {error && <div className="form-error-banner">{error}</div>}
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            const result = await createLesson(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else {
              formRef.current?.reset();
              setOpen(false);
              router.refresh();
            }
          })
        }
      >
        <input type="hidden" name="chapter_id" value={chapterId} />
        <input type="hidden" name="course_id" value={courseId} />
        <div className="field">
          <label>Titre</label>
          <input name="title" required />
        </div>
        <div className="field">
          <label>Type de contenu</label>
          <select name="content_type" value={contentType} onChange={(e) => setContentType(e.target.value)}>
            <option value="text">Texte</option>
            <option value="video">Vidéo</option>
            <option value="pdf">PDF</option>
            <option value="audio">Audio</option>
            <option value="exercise">Exercice</option>
            <option value="link">Lien externe</option>
          </select>
        </div>
        {contentType === "text" || contentType === "exercise" ? (
          <div className="field">
            <label>Contenu</label>
            <textarea name="content_body" rows={4} />
          </div>
        ) : (
          <div className="field">
            <label>URL du contenu</label>
            <input name="content_url" type="url" placeholder="https://..." />
          </div>
        )}
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "..." : "Ajouter"}</button>
          <button type="button" className="btn btn-secondary" onClick={() => setOpen(false)}>Annuler</button>
        </div>
      </form>
    </div>
  );
}
