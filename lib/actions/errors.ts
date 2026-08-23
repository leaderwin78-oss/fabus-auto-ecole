// Les messages d'erreur PostgreSQL nomment les colonnes, les contraintes et
// les policies RLS. Les renvoyer tels quels au navigateur donne à un attaquant
// une carte du schéma et des règles à contourner. Ils partent désormais dans
// les logs serveur, et l'utilisateur reçoit une phrase utilisable.
//
// Ce module n'est PAS "use server" : ce n'est pas un point d'entrée.

export function erreurInterne(error: { message?: string } | null, contexte: string): string {
  console.error(`[${contexte}]`, error?.message ?? error);
  return "Une erreur est survenue. Réessayez, ou contactez le support si le problème persiste.";
}
