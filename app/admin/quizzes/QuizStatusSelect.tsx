"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateQuizStatus } from "@/lib/actions/quizzes";

export function QuizStatusSelect({ quizId, status }: { quizId: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={status}
      disabled={isPending}
      onChange={(e) =>
        startTransition(async () => {
          await updateQuizStatus(quizId, e.target.value as "draft" | "published" | "archived");
          router.refresh();
        })
      }
      style={{ padding: "0.4rem 0.75rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)" }}
    >
      <option value="draft">Brouillon</option>
      <option value="published">Publié</option>
      <option value="archived">Archivé</option>
    </select>
  );
}
