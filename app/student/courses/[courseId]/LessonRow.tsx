"use client";

import { useState, useTransition } from "react";
import { markLessonComplete } from "@/lib/actions/courses";

interface Lesson {
  id: string;
  title: string;
  content_type: string;
  content_body: string | null;
  content_url: string | null;
}

export function LessonRow({ lesson, icon, completed }: { lesson: Lesson; icon: string; completed: boolean }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(completed);
  const [isPending, startTransition] = useTransition();

  return (
    <div style={{ border: "1px solid var(--border-color)", borderRadius: "var(--radius-md)", padding: "0.85rem 1rem" }}>
      <div className="flex items-center justify-between" style={{ cursor: "pointer" }} onClick={() => setOpen((o) => !o)}>
        <div className="flex items-center gap-2">
          <i className={icon} style={{ color: "var(--accent-text)" }}></i>
          <span style={{ fontWeight: 500 }}>{lesson.title}</span>
        </div>
        {done ? (
          <span className="badge">Terminé</span>
        ) : (
          <i className={`fa-solid fa-chevron-${open ? "up" : "down"}`} style={{ color: "var(--text-muted)" }}></i>
        )}
      </div>

      {open && (
        <div className="mt-4" style={{ paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
          {lesson.content_body && <p className="text-sm">{lesson.content_body}</p>}
          {lesson.content_url && (
            <a href={lesson.content_url} target="_blank" rel="noreferrer" className="text-sm" style={{ color: "var(--info)" }}>
              Ouvrir le contenu <i className="fa-solid fa-arrow-up-right-from-square"></i>
            </a>
          )}
          {!done && (
            <button
              className="btn btn-primary btn-sm mt-4"
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  const result = await markLessonComplete(lesson.id);
                  if (result.ok) setDone(true);
                })
              }
            >
              {isPending ? "..." : "Marquer comme terminé"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
