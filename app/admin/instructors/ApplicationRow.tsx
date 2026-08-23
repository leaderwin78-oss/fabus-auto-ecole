"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveInstructor, rejectInstructor } from "@/lib/actions/people";

export function ApplicationRow({
  userId,
  fullName,
  phone,
  licenseNumber,
  yearsExperience,
  categories,
  bio,
}: {
  userId: string;
  fullName: string;
  phone: string | null;
  licenseNumber: string | null;
  yearsExperience: number | null;
  categories: string[];
  bio: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function approve() {
    startTransition(async () => {
      setError(null);
      const result = await approveInstructor(userId);
      if (!result.ok) setError(result.error ?? "Erreur");
      else router.refresh();
    });
  }

  function reject() {
    startTransition(async () => {
      setError(null);
      const result = await rejectInstructor(userId, reason);
      if (!result.ok) setError(result.error ?? "Erreur");
      else { setRejecting(false); router.refresh(); }
    });
  }

  return (
    <div className="card mb-4">
      <div className="flex justify-between items-center gap-4 mb-4" style={{ flexWrap: "wrap" }}>
        <div>
          <h4 className="mb-0">{fullName}</h4>
          <span className="text-sm text-muted-color">{phone ?? "Téléphone non renseigné"}</span>
        </div>
        <span className="badge badge-warning">En attente</span>
      </div>

      <dl className="review-list">
        <div className="review-row"><dt>Numéro d&apos;agrément</dt><dd>{licenseNumber ?? "—"}</dd></div>
        <div className="review-row"><dt>Expérience</dt><dd>{yearsExperience !== null ? `${yearsExperience} an(s)` : "—"}</dd></div>
        <div className="review-row"><dt>Catégories</dt><dd>{categories.length > 0 ? categories.join(", ") : "—"}</dd></div>
      </dl>

      {bio && <p className="text-sm text-muted-color" style={{ whiteSpace: "pre-wrap" }}>{bio}</p>}

      {error && <div className="form-error-banner">{error}</div>}

      {rejecting ? (
        <div>
          <div className="field">
            <label htmlFor={`reason-${userId}`}>Motif du refus (communiqué au candidat)</label>
            <input id={`reason-${userId}`} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
          </div>
          <div className="flex gap-2">
            <button className="btn btn-danger btn-sm" onClick={reject} disabled={isPending}>Confirmer le refus</button>
            <button className="btn btn-secondary btn-sm" onClick={() => setRejecting(false)} disabled={isPending}>Annuler</button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button className="btn btn-primary btn-sm" onClick={approve} disabled={isPending}>
            <i className="fa-solid fa-check"></i> Valider le moniteur
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => setRejecting(true)} disabled={isPending}>
            Refuser
          </button>
        </div>
      )}
    </div>
  );
}
