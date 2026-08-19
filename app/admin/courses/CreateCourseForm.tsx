"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCourse } from "@/lib/actions/courses";

export function CreateCourseForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card">
      <h4 className="mb-4" style={{ fontSize: "1.1rem" }}>Nouvelle formation</h4>
      {error && <div className="form-error-banner">{error}</div>}
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            const result = await createCourse(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else {
              formRef.current?.reset();
              router.refresh();
            }
          })
        }
      >
        <div className="field">
          <label htmlFor="c-title">Titre</label>
          <input id="c-title" name="title" required placeholder="Ex: Code de la route" />
        </div>
        <div className="field">
          <label htmlFor="c-category">Catégorie</label>
          <select id="c-category" name="category" defaultValue="code">
            <option value="code">Code de la route</option>
            <option value="conduite">Conduite</option>
            <option value="perfectionnement">Perfectionnement</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="c-desc">Description</label>
          <textarea id="c-desc" name="description" rows={3} />
        </div>
        <div className="field">
          <label htmlFor="c-price">Prix (F CFA)</label>
          <input id="c-price" name="price_fcfa" type="number" min={0} defaultValue={0} />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={isPending}>
          {isPending ? "Création..." : "Créer la formation"}
        </button>
      </form>
    </div>
  );
}
