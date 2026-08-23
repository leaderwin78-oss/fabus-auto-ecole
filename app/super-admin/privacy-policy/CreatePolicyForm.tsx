"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPrivacyPolicyVersion } from "@/lib/actions/privacy";

export function CreatePolicyForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card">
      <h4 className="mb-4" style={{ fontSize: "1.1rem" }}>Nouvelle version</h4>
      {error && <div className="form-error-banner">{error}</div>}
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            const result = await createPrivacyPolicyVersion(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else { formRef.current?.reset(); router.refresh(); }
          })
        }
      >
        <div className="field"><label>Version</label><input name="version" required placeholder="1.0" /></div>
        <div className="field"><label>Titre</label><input name="title" required placeholder="Politique de confidentialité" /></div>
        <div className="field"><label>Contenu</label><textarea name="content" required rows={10} /></div>
        <button type="submit" className="btn btn-primary w-full" disabled={isPending}>{isPending ? "..." : "Créer (brouillon)"}</button>
      </form>
    </div>
  );
}
