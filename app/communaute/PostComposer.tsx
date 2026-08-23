"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPost } from "@/lib/actions/community";

export function PostComposer() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card">
      {error && <div className="form-error-banner">{error}</div>}
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            const result = await createPost(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else {
              formRef.current?.reset();
              router.refresh();
            }
          })
        }
      >
        <textarea
          name="body"
          required
          rows={3}
          placeholder="Partagez votre expérience, une réussite, une question..."
          style={{ width: "100%", padding: "0.85rem 1rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", fontFamily: "inherit", marginBottom: "0.75rem" }}
        />
        <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "Publication..." : "Publier"}</button>
      </form>
    </div>
  );
}
