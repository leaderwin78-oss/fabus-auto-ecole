"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inviteStaffMember } from "@/lib/actions/people";

export function InviteStaffForm({ role, label }: { role: "instructor" | "student"; label: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card">
      <h4 className="mb-4" style={{ fontSize: "1.1rem" }}>Inviter {label.toLowerCase()}</h4>
      {error && <div className="form-error-banner">{error}</div>}
      {success && <div className="form-success-banner">Invitation envoyée par email.</div>}
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            setSuccess(false);
            formData.set("role", role);
            const result = await inviteStaffMember(formData);
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
          <label htmlFor={`${role}-name`}>Nom complet</label>
          <input id={`${role}-name`} name="full_name" required />
        </div>
        <div className="field">
          <label htmlFor={`${role}-email`}>Email</label>
          <input id={`${role}-email`} name="email" type="email" required />
        </div>
        <div className="field">
          <label htmlFor={`${role}-phone`}>Téléphone (optionnel)</label>
          <input id={`${role}-phone`} name="phone" type="tel" />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={isPending}>
          {isPending ? "Envoi..." : `Envoyer l'invitation`}
        </button>
      </form>
    </div>
  );
}
