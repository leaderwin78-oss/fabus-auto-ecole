// Les clients Supabase lisaient `process.env.X!` sans vérification : si une
// variable manquait au déploiement, l'application démarrait quand même et
// échouait plus tard sur une erreur incompréhensible. On échoue ici, tout de
// suite, avec le nom de la variable en cause.
//
// createAdminClient() faisait déjà cette vérification ; on l'étend aux clients
// navigateur, serveur et middleware.

function requis(nom: string, valeur: string | undefined): string {
  if (!valeur) {
    throw new Error(
      `Variable d'environnement manquante : ${nom}. ` +
        `Renseignez-la dans .env.local en local, ou dans les variables du projet Vercel en production ` +
        `(voir .env.local.example).`
    );
  }
  return valeur;
}

export function supabaseUrl(): string {
  return requis("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function supabaseAnonKey(): string {
  return requis("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
