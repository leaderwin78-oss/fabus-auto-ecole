"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Factor {
  id: string;
  status: string;
  factor_type: string;
}

export function TwoFactorSection() {
  const supabase = createClient();
  const [factors, setFactors] = useState<Factor[] | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadFactors() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors(data?.totp ?? []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount, not a render loop
    loadFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startEnroll() {
    setError(null);
    setBusy(true);
    const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: "totp" });
    setBusy(false);
    if (enrollError) { setError(enrollError.message); return; }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setEnrolling(true);
  }

  async function confirmEnroll() {
    if (!factorId) return;
    setError(null);
    setBusy(true);
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) { setBusy(false); setError(challengeError?.message ?? "Erreur"); return; }

    const { error: verifyError } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    setBusy(false);
    if (verifyError) { setError(verifyError.message); return; }

    setEnrolling(false);
    setQrCode(null);
    setCode("");
    await loadFactors();
  }

  async function disable(id: string) {
    setBusy(true);
    await supabase.auth.mfa.unenroll({ factorId: id });
    setBusy(false);
    await loadFactors();
  }

  if (factors === null) return <p className="text-muted-color">Chargement...</p>;

  const active = factors.find((f) => f.status === "verified");

  return (
    <div>
      {error && <div className="form-error-banner">{error}</div>}

      {active ? (
        <div className="flex items-center justify-between">
          <div>
            <p className="mb-0" style={{ fontWeight: 600 }}><i className="fa-solid fa-shield-halved" style={{ color: "var(--success)" }}></i> 2FA activée</p>
            <p className="text-sm text-muted-color mb-0">Votre compte est protégé par une application d&apos;authentification.</p>
          </div>
          <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => disable(active.id)}>Désactiver</button>
        </div>
      ) : enrolling && qrCode ? (
        <div>
          <p className="text-sm text-muted-color mb-4">
            Scannez ce QR code avec Google Authenticator, Authy ou une app similaire, puis entrez le code à 6 chiffres.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrCode} alt="QR code 2FA" style={{ width: 180, height: 180, marginBottom: "1rem" }} />
          {secret && <p className="text-sm text-muted-color mb-4">Ou entrez la clé manuellement : <code>{secret}</code></p>}
          <div className="flex gap-2">
            <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" maxLength={6}
              style={{ padding: "0.6rem 0.9rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", width: 120 }} />
            <button className="btn btn-primary" disabled={busy || code.length !== 6} onClick={confirmEnroll}>Confirmer</button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-color mb-0">Ajoutez une couche de sécurité supplémentaire à votre compte.</p>
          <button className="btn btn-secondary btn-sm" disabled={busy} onClick={startEnroll}>Activer la 2FA</button>
        </div>
      )}
    </div>
  );
}
