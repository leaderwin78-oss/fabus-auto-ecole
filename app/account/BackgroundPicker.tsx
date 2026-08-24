"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOwnBackground } from "@/lib/actions/account";

const CHOIX = [
  { cle: "", nom: "Celui de la plateforme", apercu: null },
  { cle: "route-panneaux", nom: "Route et panneaux", apercu: "route-panneaux" },
  { cle: "salle-calme", nom: "Salle de cours calme", apercu: "salle-calme" },
  { cle: "salle-eleves", nom: "Cours de code", apercu: "salle-eleves" },
  { cle: "salle-formation", nom: "Salle de formation", apercu: "salle-formation" },
  { cle: "ville-auto-ecole", nom: "Auto-école en ville", apercu: "ville-auto-ecole" },
  { cle: "moniteur-voiture", nom: "Moniteur et véhicule", apercu: "moniteur-voiture" },
];

export function BackgroundPicker({ actuel }: { actuel: string | null }) {
  const router = useRouter();
  const [choisi, setChoisi] = useState(actuel ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function choisir(cle: string) {
    const precedent = choisi;
    setChoisi(cle); // retour visuel immédiat
    startTransition(async () => {
      setErreur(null);
      const r = await updateOwnBackground(cle);
      if (!r.ok) { setErreur(r.error ?? "Erreur"); setChoisi(precedent); }
      else router.refresh();
    });
  }

  return (
    <div>
      {erreur && <div className="form-error-banner">{erreur}</div>}
      <p className="text-sm text-muted-color mb-4">
        Ce fond s&apos;affiche derrière votre espace, sur tous vos écrans. Il ne concerne que vous.
      </p>
      <div className="fonds-grille">
        {CHOIX.map((c) => (
          <button
            key={c.cle}
            type="button"
            className={`fond-vignette${choisi === c.cle ? " choisi" : ""}`}
            onClick={() => choisir(c.cle)}
            disabled={isPending}
            aria-pressed={choisi === c.cle}
          >
            <span
              className="fond-image"
              style={c.apercu ? { backgroundImage: `url(/images/bg/${c.apercu}@800.webp)` } : undefined}
            >
              {!c.apercu && <i className="fa-solid fa-ban"></i>}
              {choisi === c.cle && <i className="fa-solid fa-circle-check fond-coche"></i>}
            </span>
            <span className="fond-nom">{c.nom}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
