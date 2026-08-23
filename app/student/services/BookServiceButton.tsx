"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bookInstructorService } from "@/lib/actions/services";

export function BookServiceButton({ serviceId }: { serviceId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      {error && <p className="field-error mb-2">{error}</p>}
      <button
        className="btn btn-primary w-full"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            const result = await bookInstructorService(serviceId);
            if (!result.ok) setError(result.error ?? "Erreur");
            else router.refresh();
          })
        }
      >
        {isPending ? "..." : "Réserver"}
      </button>
    </div>
  );
}
