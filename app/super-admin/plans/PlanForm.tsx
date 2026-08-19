"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { upsertPlan } from "@/lib/actions/organizations";

export function PlanForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card">
      <h4 className="mb-4" style={{ fontSize: "1.1rem" }}>Nouveau plan</h4>
      {error && <div className="form-error-banner">{error}</div>}
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            const result = await upsertPlan(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else {
              formRef.current?.reset();
              router.refresh();
            }
          })
        }
      >
        <div className="field">
          <label>Code</label>
          <input name="code" required placeholder="starter" />
        </div>
        <div className="field">
          <label>Nom</label>
          <input name="name" required placeholder="Starter" />
        </div>
        <div className="field">
          <label>Prix mensuel (F CFA)</label>
          <input name="price_fcfa" type="number" min={0} required />
        </div>
        <div className="field">
          <label>Nb. moniteurs max (vide = illimité)</label>
          <input name="max_instructors" type="number" min={1} />
        </div>
        <div className="field">
          <label>Nb. élèves max (vide = illimité)</label>
          <input name="max_students" type="number" min={1} />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={isPending}>{isPending ? "..." : "Créer le plan"}</button>
      </form>
    </div>
  );
}
