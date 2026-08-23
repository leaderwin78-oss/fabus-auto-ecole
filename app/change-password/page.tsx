"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changeOwnPassword } from "@/lib/actions/account";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await changeOwnPassword(formData);
    setLoading(false);
    if (!result.ok) setError(result.error ?? "Erreur");
    else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <main className="flex items-center justify-center" style={{ minHeight: "100vh", padding: "2rem" }}>
      <div className="card" style={{ maxWidth: 420, width: "100%" }}>
        <div className="icon-box" style={{ margin: "0 auto 1.5rem" }}><i className="fa-solid fa-key"></i></div>
        <h2 className="mb-2 text-center">Choisissez votre mot de passe</h2>
        <p className="text-muted-color mb-8 text-center">
          Pour la sécurité de votre compte, vous devez définir un nouveau mot de passe avant de continuer.
        </p>

        {error && <div className="form-error-banner">{error}</div>}

        <form action={handleSubmit}>
          <div className="field">
            <label htmlFor="new_password">Nouveau mot de passe</label>
            <input id="new_password" name="new_password" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <div className="field">
            <label htmlFor="confirm_password">Confirmer le mot de passe</label>
            <input id="confirm_password" name="confirm_password" type="password" required minLength={8} autoComplete="new-password" />
          </div>
          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? "..." : "Valider"}
          </button>
        </form>
      </div>
    </main>
  );
}
