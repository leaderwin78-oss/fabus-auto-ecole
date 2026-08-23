"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOwnProfile } from "@/lib/actions/account";

export function ProfileForm({ fullName, phone }: { fullName: string; phone: string | null }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      {error && <div className="form-error-banner">{error}</div>}
      {success && <div className="form-success-banner">Profil mis à jour.</div>}
      <form
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            setSuccess(false);
            const result = await updateOwnProfile(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else {
              setSuccess(true);
              router.refresh();
            }
          })
        }
      >
        <div className="field"><label>Nom complet</label><input name="full_name" required defaultValue={fullName} /></div>
        <div className="field"><label>Téléphone</label><input name="phone" type="tel" defaultValue={phone ?? ""} /></div>
        <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "..." : "Enregistrer"}</button>
      </form>
    </div>
  );
}
