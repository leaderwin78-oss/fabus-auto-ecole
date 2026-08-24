import type { SupabaseClient } from "@supabase/supabase-js";

// État d'abonnement d'une auto-école, tel que l'application doit y réagir.
// La qualification vit dans Postgres (etat_abonnement, migration 0015) et non
// ici : la tâche d'expiration et l'interface doivent lire exactement la même
// règle, sinon un compte paraît actif dans l'application et expiré pour le
// travail de fond, ou l'inverse.
export type EtatAbonnement = "actif" | "bientot" | "grace" | "expire" | "aucun";

export interface Abonnement {
  etat: EtatAbonnement;
  /** Fin de la période en cours (essai ou payante). */
  fin: string | null;
  /** Jours restants avant la fin ; négatif une fois dépassée. */
  jours: number | null;
  planNom: string | null;
  planPrix: number | null;
  /** L'accès doit-il être restreint ? */
  bloque: boolean;
}

export async function lireAbonnement(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  organizationId: string | null
): Promise<Abonnement | null> {
  if (!organizationId) return null;

  const [{ data: etat }, { data: sub }] = await Promise.all([
    supabase.rpc("etat_abonnement", { p_org: organizationId }),
    supabase
      .from("subscriptions")
      .select("trial_end, current_period_end, status, plans(name, price_fcfa)")
      .eq("organization_id", organizationId)
      .neq("status", "canceled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const plan = sub ? (Array.isArray(sub.plans) ? sub.plans[0] : sub.plans) : null;
  const fin = (sub?.trial_end ?? sub?.current_period_end) ?? null;
  const jours = fin ? Math.ceil((new Date(fin).getTime() - Date.now()) / 86_400_000) : null;
  const e = (etat as EtatAbonnement) ?? "aucun";

  return {
    etat: e,
    fin,
    jours,
    planNom: (plan as { name?: string } | null)?.name ?? null,
    planPrix: (plan as { price_fcfa?: number } | null)?.price_fcfa ?? null,
    bloque: e === "expire",
  };
}
