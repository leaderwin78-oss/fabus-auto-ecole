import { z } from "zod";

// Schémas partagés par les actions serveur. `zod` était déclaré dans
// package.json sans jamais être importé : toute la validation se faisait à la
// main, de façon inégale — présence et longueur parfois, types et bornes
// rarement. Ce n'était pas exploitable directement (le RLS reste la vraie
// barrière et l'identité vient toujours de la session) mais des montants et
// des prix non bornés atteignaient la base sans contrôle de plage.
//
// NOTE : ce module n'est PAS "use server". Un export de module "use server"
// devient un point d'entrée appelable depuis le navigateur ; des schémas de
// validation n'ont rien à y faire.

/** Montant en francs CFA : entier positif, plafonné pour écarter les saisies aberrantes. */
export const MontantFcfa = z.coerce.number().int().min(0).max(50_000_000);

/** Montant strictement positif, pour un paiement ou une prestation facturée. */
export const MontantFcfaPositif = z.coerce.number().int().positive().max(50_000_000);

export const Uuid = z.string().uuid();

/** Texte court obligatoire (titre, nom). */
export const TexteCourt = z.string().trim().min(1).max(200);

/** Texte long facultatif (description, observations). */
export const TexteLong = z.string().trim().max(5000).optional().or(z.literal(""));

/** Pourcentage 0-100. */
export const Pourcentage = z.coerce.number().int().min(0).max(100);

// Seuls http(s) sont acceptés. Sans ce contrôle, une URL `javascript:...`
// saisie par un admin dans une leçon devient du XSS stocké au moment où
// l'élève clique sur le lien (rendu en <a href>).
const SCHEMES_AUTORISES = ["http:", "https:"];

export const UrlExterne = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    if (!value) return true;
    try {
      return SCHEMES_AUTORISES.includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, "L'adresse doit commencer par http:// ou https://");

/**
 * Valide une URL saisie par un utilisateur avant stockage.
 * Retourne null pour une valeur vide, undefined si le schéma est refusé.
 */
export function urlExterneOuNull(raw: string): string | null | undefined {
  const value = raw.trim();
  if (!value) return null;
  const parsed = UrlExterne.safeParse(value);
  return parsed.success ? value : undefined;
}

// ---------------------------------------------------------------------------
// Téléversements
// ---------------------------------------------------------------------------

export const TYPES_IMAGE = ["image/jpeg", "image/png", "image/webp"];
export const TYPES_DOCUMENT = [...TYPES_IMAGE, "application/pdf"];

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

/**
 * Vérifie le type MIME côté serveur et construit un nom de fichier sûr.
 * Le nom fourni par le client n'est jamais réutilisé : il pourrait contenir
 * des séparateurs de chemin, et sa seule information utile est l'extension —
 * que l'on dérive du type déclaré à la place.
 */
export function fichierValide(
  file: File,
  typesAutorises: string[],
  tailleMaxOctets: number
): { ok: true; extension: string } | { ok: false; error: string } {
  if (!file || file.size === 0) return { ok: false, error: "Choisissez un fichier." };
  if (file.size > tailleMaxOctets) {
    return { ok: false, error: `Fichier trop volumineux (max ${Math.round(tailleMaxOctets / 1024 / 1024)} Mo).` };
  }
  if (!typesAutorises.includes(file.type)) {
    const lisibles = typesAutorises.map((t) => EXTENSIONS[t]?.toUpperCase() ?? t).join(", ");
    return { ok: false, error: `Format non autorisé. Formats acceptés : ${lisibles}.` };
  }
  return { ok: true, extension: EXTENSIONS[file.type] ?? "bin" };
}
