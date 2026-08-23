"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAnnouncement } from "@/lib/actions/announcements";

export function CreateAnnouncementForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card">
      <h4 className="mb-4" style={{ fontSize: "1.1rem" }}>Nouvelle annonce</h4>
      {error && <div className="form-error-banner">{error}</div>}
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            const result = await createAnnouncement(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else { formRef.current?.reset(); router.refresh(); }
          })
        }
      >
        <div className="field"><label>Titre</label><input name="title" required /></div>
        <div className="field">
          <label>Catégorie</label>
          <select name="category" defaultValue="annonce">
            <option value="annonce">Annonce</option>
            <option value="examen">Date d&apos;examen</option>
            <option value="reglementation">Réglementation</option>
            <option value="pedagogique">Information pédagogique</option>
          </select>
        </div>
        <div className="field"><label>Contenu</label><textarea name="content" required rows={6} /></div>
        <button type="submit" className="btn btn-primary w-full" disabled={isPending}>{isPending ? "..." : "Créer (brouillon)"}</button>
      </form>
    </div>
  );
}
