"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Organization } from "@/types/database";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [schools, setSchools] = useState<Organization[]>([]);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [organizationId, setOrganizationId] = useState(searchParams.get("school") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase
      .from("organizations")
      .select("*")
      .eq("status", "active")
      .order("name")
      .then(({ data }) => setSchools(data ?? []));
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!organizationId) {
      setError("Merci de choisir votre auto-école.");
      return;
    }

    setLoading(true);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    const userId = signUpData.user?.id;
    if (!userId) {
      setError("Impossible de créer le compte. Réessayez.");
      setLoading(false);
      return;
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      organization_id: organizationId,
      role: "student",
      full_name: fullName,
      phone: phone || null,
    });

    if (profileError) {
      setError(`Compte créé mais profil incomplet : ${profileError.message}. Contactez le support.`);
      setLoading(false);
      return;
    }

    if (!signUpData.session) {
      // Email confirmation required by the Supabase project's auth settings.
      setPendingConfirmation(true);
      setLoading(false);
      return;
    }

    router.push("/student");
    router.refresh();
  }

  if (pendingConfirmation) {
    return (
      <div className="card text-center" style={{ maxWidth: 460 }}>
        <div className="icon-box" style={{ margin: "0 auto 1.5rem" }}><i className="fa-solid fa-envelope"></i></div>
        <h2 className="mb-2">Vérifiez votre email</h2>
        <p className="text-muted-color mb-0">
          Un lien de confirmation a été envoyé à <strong>{email}</strong>. Cliquez dessus pour
          activer votre compte, puis connectez-vous.
        </p>
      </div>
    );
  }

  return (
    <div className="card" style={{ maxWidth: 460, width: "100%" }}>
      <h2 className="mb-2">Créer mon compte élève</h2>
      <p className="text-muted-color mb-8">Rejoignez votre auto-école sur FABUS.</p>

      {error && <div className="form-error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="school">Auto-école</label>
          <select id="school" required value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
            <option value="">Choisir une auto-école...</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}{s.city ? ` — ${s.city}` : ""}</option>
            ))}
          </select>
          {schools.length === 0 && (
            <span className="text-sm text-muted-color">
              Aucune auto-école active pour l&apos;instant. Un super admin doit d&apos;abord en créer une.
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="fullName">Nom complet</label>
          <input id="fullName" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="phone">Téléphone (optionnel)</label>
          <input id="phone" type="tel" placeholder="+221 7X XXX XX XX" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={loading || schools.length === 0}>
          {loading ? "Création..." : "Créer mon compte"}
        </button>
      </form>

      <p className="text-sm text-muted-color mt-4 text-center">
        Déjà inscrit ?{" "}
        <Link href="/login" style={{ color: "var(--fabus-green)", fontWeight: 600 }}>Se connecter</Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <main className="flex items-center justify-center" style={{ minHeight: "100vh", padding: "2rem" }}>
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </main>
  );
}
