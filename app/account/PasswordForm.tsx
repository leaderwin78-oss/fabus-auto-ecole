"use client";

import { useRef, useState, useTransition } from "react";
import { changeOwnPassword } from "@/lib/actions/account";

export function PasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div>
      {error && <div className="form-error-banner">{error}</div>}
      {success && <div className="form-success-banner">Mot de passe modifié.</div>}
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            setSuccess(false);
            const result = await changeOwnPassword(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else {
              setSuccess(true);
              formRef.current?.reset();
            }
          })
        }
      >
        <div className="field"><label>Nouveau mot de passe</label><input name="new_password" type="password" required minLength={8} autoComplete="new-password" /></div>
        <div className="field"><label>Confirmer</label><input name="confirm_password" type="password" required minLength={8} autoComplete="new-password" /></div>
        <button type="submit" className="btn btn-primary" disabled={isPending}>{isPending ? "..." : "Modifier le mot de passe"}</button>
      </form>
    </div>
  );
}
