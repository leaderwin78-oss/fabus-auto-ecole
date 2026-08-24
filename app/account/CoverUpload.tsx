"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOwnCover } from "@/lib/actions/account";

export function CoverUpload({ coverUrl }: { coverUrl: string | null }) {
  const router = useRouter();
  const champ = useRef<HTMLInputElement>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function envoyer(fichier: File) {
    const fd = new FormData();
    fd.set("file", fichier);
    startTransition(async () => {
      setErreur(null);
      const r = await updateOwnCover(fd);
      if (!r.ok) { setErreur(r.error ?? "Erreur"); setApercu(null); }
      else router.refresh();
    });
  }

  return (
    <div>
      {erreur && <div className="form-error-banner">{erreur}</div>}

      <div className="couverture-apercu">
        {apercu || coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- image de profil, servie telle quelle depuis le stockage
          <img src={apercu ?? coverUrl ?? ""} alt="Votre photo de couverture" />
        ) : (
          <div className="couverture-vide">
            <i className="fa-solid fa-image"></i>
            <span>Aucune photo de couverture</span>
          </div>
        )}
      </div>

      <input
        ref={champ}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        id="couverture"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setApercu(URL.createObjectURL(f));
          envoyer(f);
        }}
      />
      <label htmlFor="couverture" className="btn btn-secondary" style={{ cursor: isPending ? "wait" : "pointer" }}>
        <i className="fa-solid fa-arrow-up-from-bracket"></i> {isPending ? "Envoi..." : coverUrl ? "Changer la couverture" : "Ajouter une couverture"}
      </label>
      <p className="text-sm text-muted-color mt-2 mb-0">JPEG, PNG ou WebP — 6 Mo maximum. Format large recommandé (1500 × 500).</p>
    </div>
  );
}
