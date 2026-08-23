"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createResourceLink } from "@/lib/actions/resources";

export function CreateResourceForm({ categories }: { categories: Record<string, string> }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card">
      <h4 className="mb-4" style={{ fontSize: "1.1rem" }}>Ajouter une ressource</h4>
      {error && <div className="form-error-banner">{error}</div>}
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            const result = await createResourceLink(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else { formRef.current?.reset(); router.refresh(); }
          })
        }
      >
        <div className="field"><label>Titre</label><input name="title" required /></div>
        <div className="field"><label>Lien</label><input name="url" type="url" required placeholder="https://..." /></div>
        <div className="field">
          <label>Catégorie</label>
          <select name="category" defaultValue="autre">
            {Object.entries(categories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="field"><label>Description (optionnel)</label><textarea name="description" rows={2} /></div>
        <button type="submit" className="btn btn-primary w-full" disabled={isPending}>{isPending ? "..." : "Ajouter"}</button>
      </form>
    </div>
  );
}
