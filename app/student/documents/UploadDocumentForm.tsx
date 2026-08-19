"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadDocument } from "@/lib/actions/documents";

const CATEGORIES = [
  { value: "cni", label: "Pièce d'identité (CNI)" },
  { value: "certificat_medical", label: "Certificat médical" },
  { value: "timbre_fiscal", label: "Timbre fiscal" },
  { value: "photo", label: "Photo d'identité" },
  { value: "autre", label: "Autre" },
];

export function UploadDocumentForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card">
      {error && <div className="form-error-banner">{error}</div>}
      {success && <div className="form-success-banner">Document envoyé avec succès.</div>}
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            setSuccess(false);
            const result = await uploadDocument(formData);
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
          <label htmlFor="title">Titre</label>
          <input id="title" name="title" required placeholder="Ex: Carte d'identité recto-verso" />
        </div>
        <div className="field">
          <label htmlFor="category">Catégorie</label>
          <select id="category" name="category" defaultValue="autre">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="file">Fichier</label>
          <input id="file" name="file" type="file" required accept="image/*,application/pdf" />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={isPending}>
          {isPending ? "Envoi..." : "Envoyer le document"}
        </button>
      </form>
    </div>
  );
}
