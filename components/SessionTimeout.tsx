"use client";

import { useEffect, useRef, useState } from "react";

// Déconnexion automatique après une période sans activité.
//
// La durée est ici, en un seul endroit, parce que c'est un arbitrage et pas une
// constante technique : trop courte, elle déconnecte un élève en train de lire
// une leçon ou de remplir son inscription ; trop longue, elle laisse une
// session ouverte sur un téléphone posé sur une table. 15 minutes est la
// valeur usuelle des services bancaires en ligne — assez court pour protéger
// un appareil laissé sans surveillance, assez long pour ne jamais couper
// quelqu'un au milieu d'une tâche.
export const DELAI_INACTIVITE_MS = 15 * 60 * 1000;
const PREAVIS_MS = 30 * 1000;

// Ce qui compte comme activité. Le défilement et la frappe en font partie :
// se limiter aux clics déconnecterait quelqu'un en train de lire.
const EVENEMENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "wheel", "focus"];

export function SessionTimeout({ actif }: { actif: boolean }) {
  const [secondesRestantes, setSecondesRestantes] = useState<number | null>(null);
  // Initialisé à 0 puis renseigné dans l'effet : appeler Date.now() pendant le
  // rendu rendrait le composant impur (résultat différent à chaque re-rendu).
  const dernierMouvement = useRef(0);
  const formulaire = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!actif) return;
    dernierMouvement.current = Date.now();

    const marquer = () => {
      dernierMouvement.current = Date.now();
      setSecondesRestantes((v) => (v === null ? v : null));
    };
    EVENEMENTS.forEach((e) => window.addEventListener(e, marquer, { passive: true }));

    const minuteur = setInterval(() => {
      const inactifDepuis = Date.now() - dernierMouvement.current;
      const restant = DELAI_INACTIVITE_MS - inactifDepuis;

      if (restant <= 0) {
        // On passe par le formulaire POST /auth/signout : c'est le même chemin
        // que le bouton Déconnexion, donc le cookie de session est bien
        // invalidé côté serveur, pas seulement oublié côté navigateur.
        formulaire.current?.requestSubmit();
        return;
      }
      setSecondesRestantes(restant <= PREAVIS_MS ? Math.ceil(restant / 1000) : null);
    }, 1000);

    return () => {
      EVENEMENTS.forEach((e) => window.removeEventListener(e, marquer));
      clearInterval(minuteur);
    };
  }, [actif]);

  return (
    <>
      <form ref={formulaire} action="/auth/signout" method="post" hidden />
      {secondesRestantes !== null && (
        <div className="preavis-session" role="alert">
          <i className="fa-solid fa-clock"></i>
          <span>
            Vous allez être déconnecté dans <strong>{secondesRestantes} s</strong> par sécurité.
          </span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              dernierMouvement.current = Date.now();
              setSecondesRestantes(null);
            }}
          >
            Rester connecté
          </button>
        </div>
      )}
    </>
  );
}
