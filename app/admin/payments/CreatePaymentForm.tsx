"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPaymentRequest } from "@/lib/actions/payments";

export function CreatePaymentForm({ students }: { students: { id: string; full_name: string }[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card">
      <h4 className="mb-4" style={{ fontSize: "1.1rem" }}>Enregistrer un paiement dû</h4>
      {error && <div className="form-error-banner">{error}</div>}
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            const result = await createPaymentRequest(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else {
              formRef.current?.reset();
              router.refresh();
            }
          })
        }
      >
        <div className="field">
          <label>Élève</label>
          <select name="student_id" required>
            <option value="">Choisir...</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Montant (F CFA)</label>
          <input name="amount_fcfa" type="number" min={1} required />
        </div>
        <div className="field">
          <label>Type</label>
          <select name="payment_type" defaultValue="registration">
            <option value="registration">Inscription (frais de gestion plateforme)</option>
            <option value="course">Formation / cours (commission plateforme)</option>
            <option value="other">Autre (aucune commission)</option>
          </select>
        </div>
        <div className="field">
          <label>Moyen prévu</label>
          <select name="provider" defaultValue="manual">
            <option value="manual">Espèces / virement</option>
            <option value="wave">Wave</option>
            <option value="orange_money">Orange Money</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={isPending}>{isPending ? "..." : "Créer la demande"}</button>
      </form>
    </div>
  );
}
