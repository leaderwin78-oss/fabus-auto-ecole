"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrganizationSettings } from "@/lib/actions/settings";
import type { Organization } from "@/types/database";

export function SettingsForm({ org }: { org: Organization }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card">
      {error && <div className="form-error-banner">{error}</div>}
      {success && <div className="form-success-banner">Informations mises à jour.</div>}
      <form
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            setSuccess(false);
            const result = await updateOrganizationSettings(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else {
              setSuccess(true);
              router.refresh();
            }
          })
        }
      >
        <div className="field">
          <label>Nom de l&apos;auto-école</label>
          <input name="name" required defaultValue={org.name} />
        </div>
        <div className="field">
          <label>Ville</label>
          <input name="city" defaultValue={org.city ?? ""} />
        </div>
        <div className="field">
          <label>Téléphone</label>
          <input name="phone" defaultValue={org.phone ?? ""} />
        </div>
        <div className="field">
          <label>Email</label>
          <input name="email" type="email" defaultValue={org.email ?? ""} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "..." : "Enregistrer"}</button>
      </form>
    </div>
  );
}
