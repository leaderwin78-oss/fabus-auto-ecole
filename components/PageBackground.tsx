import type { CSSProperties } from "react";

// Les six photos fournies, nommées par ce qu'elles montrent plutôt que par
// l'endroit où elles servent : la même image peut illustrer deux pages.
export const FONDS = {
  /** Route dégagée avec panneaux (50, passage piéton, rond-point). Aucune
   *  personne, aucun texte : le fond le plus neutre du lot. */
  route: "route-panneaux",
  /** Salle de formation avec élèves, écran de code et livres. */
  salleEleves: "salle-eleves",
  /** Salle de formation avec la signalétique de l'auto-école et les manuels
   *  "Code de la route Sénégal". */
  salleFormation: "salle-formation",
  /** Devanture d'auto-école en ville, véhicule école au premier plan. */
  ville: "ville-auto-ecole",
  /** Moniteur en polo, casque et talkie, à côté du véhicule école. */
  moniteur: "moniteur-voiture",
  /** Salle vide, lumineuse, très calme — pour les pages de travail. */
  calme: "salle-calme",
} as const;

export type Fond = (typeof FONDS)[keyof typeof FONDS];

/**
 * Pose une photo en fond de page, derrière un voile de contraste.
 *
 * `discret` renforce le voile : à utiliser partout où l'on travaille
 * (tableaux de bord, tableaux de données), où l'image ne doit être qu'une
 * nuance. Par défaut, l'image se devine davantage — pour les pages d'accueil
 * et d'inscription.
 */
export function PageBackground({ image, discret = false }: { image: Fond; discret?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`page-bg-layer${discret ? " discret" : ""}`}
      style={{
        // image-set laisse le navigateur choisir selon la densité de l'écran :
        // un téléphone 3× a besoin de bien plus de pixels qu'un ordinateur 1×.
        "--bg-img": `image-set(url(/images/bg/${image}@800.webp) 1x, url(/images/bg/${image}.webp) 2x)`,
      } as CSSProperties}
    />
  );
}
