"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createOrganization } from "@/lib/actions/organizations";
import type { Plan } from "@/types/database";

export function CreateOrganizationForm({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card">
      <h4 className="mb-4" style={{ fontSize: "1.1rem" }}>Créer une auto-école</h4>
      {error && <div className="form-error-banner">{error}</div>}
      {success && <div className="form-success-banner">Auto-école créée. L&apos;admin recevra un email d&apos;invitation.</div>}
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            setSuccess(false);
            const result = await createOrganization(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else {
              setSuccess(true);
              formRef.current?.reset();
              router.refresh();
            }
          })
        }
      >
        <div className="field">
          <label>Nom de l&apos;auto-école</label>
          <input name="name" required />
        </div>
        <div className="field">
          <label>Ville</label>
          <input name="city" defaultValue="Dakar" />
        </div>
        <div className="field">
          <label>Plan</label>
          <select name="plan_id">
            <option value="">Aucun (à définir plus tard)</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.price_fcfa.toLocaleString("fr-FR")} F/mois</option>)}
          </select>
        </div>
        <div className="field">
          <label>Nom de l&apos;administrateur</label>
          <input name="admin_name" required />
        </div>
        <div className="field">
          <label>Email de l&apos;administrateur</label>
          <input name="admin_email" type="email" required />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={isPending}>{isPending ? "Création..." : "Créer"}</button>
      </form>
    </div>
  );
}
