"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enrollInCourse } from "@/lib/actions/courses";

export function EnrollButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      {error && <p className="field-error mb-2">{error}</p>}
      <button
        className="btn btn-primary w-full"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await enrollInCourse(courseId);
            if (!result.ok) setError(result.error ?? "Erreur");
            else router.refresh();
          })
        }
      >
        {isPending ? "Inscription..." : "S'inscrire à cette formation"}
      </button>
    </div>
  );
}
