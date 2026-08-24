"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireProfile, isOrgOwnerRole } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { erreurInterne } from "@/lib/actions/errors";
import { Uuid } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/courses";

// Souscription ou renouvellement d'un abonnement d'auto-école.
//
// Le paiement passe par la table `payments` comme tout le reste : même
// facturation, même réconciliation, même trace. On ne crée pas un circuit
// parallèle pour l'abonnement — un second circuit, c'est un second endroit
// où les montants peuvent diverger.
//
// Aucune commission n'est prélevée dessus : c'est le revenu de la plateforme,
// pas une vente de l'auto-école.
export async function demanderAbonnement(planId: string): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  if (!isOrgOwnerRole(profile.role)) {
    return { ok: false, error: "Seul le responsable de l'auto-école peut souscrire." };
  }
  if (!profile.organization_id) return { ok: false, error: "Organisation introuvable." };
  if (!Uuid.safeParse(planId).success) return { ok: false, error: "Formule invalide." };

  const admin = createAdminClient();

  // Le prix vient de la base, jamais du formulaire : sinon on peut s'abonner
  // au tarif que l'on choisit soi-même.
  const { data: plan } = await admin
    .from("plans")
    .select("id, name, price_fcfa, is_active")
    .eq("id", planId)
    .maybeSingle();

  if (!plan || !plan.is_active) return { ok: false, error: "Formule indisponible." };
  if (plan.price_fcfa <= 0) return { ok: false, error: "Cette formule ne se souscrit pas : c'est l'essai gratuit." };

  const supabase = await createClient();

  // Une demande en attente suffit : on ne multiplie pas les lignes si le
  // responsable clique plusieurs fois.
  const { data: enAttente } = await supabase
    .from("payments")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("payment_type", "subscription")
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (enAttente) {
    return { ok: false, error: "Une demande de renouvellement est déjà en attente de règlement." };
  }

  const { error } = await supabase.from("payments").insert({
    organization_id: profile.organization_id,
    student_id: userId, // le responsable porte le paiement de son établissement
    amount_fcfa: plan.price_fcfa,
    payment_type: "subscription",
    provider: "manual",
    status: "pending",
  });
  if (error) return { ok: false, error: erreurInterne(error, "abonnement") };

  // Le super admin doit savoir qu'un encaissement l'attend.
  const { data: supers } = await admin.from("profiles").select("id").eq("role", "super_admin");
  if (supers?.length) {
    await admin.from("notifications").insert(
      supers.map((s) => ({
        organization_id: null,
        user_id: s.id,
        type: "subscription_requested",
        title: "Demande d'abonnement",
        body: `Une auto-école souhaite souscrire la formule ${plan.name} (${plan.price_fcfa.toLocaleString("fr-FR")} F CFA).`,
        link: "/super-admin/finance",
      }))
    );
  }

  await logActivity({
    organizationId: profile.organization_id,
    actorId: userId,
    action: "subscription.requested",
    entityType: "plan",
    entityId: plan.id,
    metadata: { plan: plan.name, montant: plan.price_fcfa },
  });

  revalidatePath("/abonnement");
  revalidatePath("/admin/settings");
  return { ok: true };
}

/**
 * Encaissement d'un abonnement : prolonge la période et remet le compte actif.
 * Réservé au super admin — c'est lui qui constate le règlement.
 */
export async function activerAbonnement(organizationId: string, planId: string, mois = 1): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "super_admin") return { ok: false, error: "Réservé au super admin." };

  const admin = createAdminClient();
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, current_period_end, trial_end")
    .eq("organization_id", organizationId)
    .neq("status", "canceled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // On prolonge à partir de la fin en cours si elle est future, sinon à partir
  // d'aujourd'hui : payer en retard ne doit pas offrir de temps gratuit, mais
  // payer en avance ne doit pas en faire perdre.
  const finActuelle = sub ? new Date(sub.trial_end ?? sub.current_period_end ?? Date.now()) : new Date();
  const depart = finActuelle.getTime() > Date.now() ? finActuelle : new Date();
  const fin = new Date(depart);
  fin.setMonth(fin.getMonth() + mois);

  const valeurs = {
    organization_id: organizationId,
    plan_id: planId,
    status: "active" as const,
    trial_end: null,
    grace_until: null,
    current_period_start: depart.toISOString(),
    current_period_end: fin.toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error } = sub
    ? await admin.from("subscriptions").update(valeurs).eq("id", sub.id)
    : await admin.from("subscriptions").insert(valeurs);

  if (error) return { ok: false, error: erreurInterne(error, "abonnement") };

  const { data: staff } = await admin
    .from("profiles")
    .select("id")
    .eq("organization_id", organizationId)
    .in("role", ["admin", "admin_auto_ecole"]);

  if (staff?.length) {
    await admin.from("notifications").insert(
      staff.map((s) => ({
        organization_id: organizationId,
        user_id: s.id,
        type: "subscription_activated",
        title: "Abonnement activé",
        body: `Votre abonnement court jusqu'au ${fin.toLocaleDateString("fr-FR")}.`,
        link: "/admin/settings",
      }))
    );
  }

  await logActivity({
    organizationId,
    actorId: userId,
    action: "subscription.activated",
    entityType: "organization",
    entityId: organizationId,
    metadata: { jusquau: fin.toISOString(), mois },
  });

  revalidatePath("/super-admin/finance");
  revalidatePath("/admin/settings");
  return { ok: true };
}
