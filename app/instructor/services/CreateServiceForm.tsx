"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInstructorService } from "@/lib/actions/services";

export function CreateServiceForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card">
      <h4 className="mb-4" style={{ fontSize: "1.1rem" }}>Nouvelle prestation</h4>
      {error && <div className="form-error-banner">{error}</div>}
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            const result = await createInstructorService(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else { formRef.current?.reset(); router.refresh(); }
          })
        }
      >
        <div className="field"><label>Titre</label><input name="title" required placeholder="Ex: Heure de conduite supplémentaire" /></div>
        <div className="field"><label>Description</label><textarea name="description" rows={2} /></div>
        <div className="field"><label>Durée (minutes)</label><input name="duration_minutes" type="number" min={1} /></div>
        <div className="field"><label>Prix (F CFA)</label><input name="price_fcfa" type="number" min={0} required /></div>
        <button type="submit" className="btn btn-primary w-full" disabled={isPending}>{isPending ? "..." : "Créer"}</button>
      </form>
    </div>
  );
}
