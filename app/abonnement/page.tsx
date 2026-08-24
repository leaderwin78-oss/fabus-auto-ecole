import Link from "next/link";
import { redirect } from "next/navigation";
import { requireProfile, isOrgStaffRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { lireAbonnement } from "@/lib/data/abonnement";
import { AuthShell } from "@/components/AuthShell";
import { PageBackground, FONDS } from "@/components/PageBackground";
import { ChoixFormule } from "./ChoixFormule";

// Page d'abonnement de l'auto-école. Elle sert deux moments très différents :
// la relance avant échéance, et le mur une fois l'accès restreint. Le contenu
// change, l'adresse non — un lien envoyé par notification reste valable.
export default async function AbonnementPage() {
  const { profile } = await requireProfile();
  if (!isOrgStaffRole(profile.role)) redirect("/dashboard");

  const supabase = await createClient();
  const [abonnement, { data: formules }] = await Promise.all([
    lireAbonnement(supabase, profile.organization_id),
    supabase.from("plans").select("*").eq("is_active", true).gt("price_fcfa", 0).order("price_fcfa"),
  ]);

  const bloque = abonnement?.bloque ?? false;
  const enRetard = abonnement?.etat === "grace" || bloque;

  return (
    <AuthShell
      background={<PageBackground image={FONDS.ville} />}
      action={
        <Link href={bloque ? "/" : "/admin"} className="btn btn-secondary btn-sm">
          {bloque ? "Accueil" : "Retour au tableau de bord"}
        </Link>
      }
    >
      <div className="auth-card auth-card-wide">
        <span className={`badge ${enRetard ? "badge-danger" : ""} mb-4`}>
          {bloque ? "Accès restreint" : enRetard ? "Échéance dépassée" : "Abonnement"}
        </span>

        <h1 className="auth-title">
          {bloque
            ? "L'accès de votre auto-école est suspendu"
            : enRetard
              ? "Votre abonnement a expiré"
              : "Renouveler votre abonnement"}
        </h1>

        <p className="auth-subtitle">
          {bloque
            ? "Le délai de régularisation est dépassé. Votre espace, vos élèves et vos données sont conservés : l'accès se rouvre dès le règlement."
            : enRetard
              ? "Votre accès reste ouvert quelques jours encore. Réglez dès maintenant pour éviter toute interruption."
              : abonnement?.jours !== null && abonnement?.jours !== undefined
                ? `Votre formule ${abonnement.planNom ?? ""} se termine dans ${abonnement.jours} jours.`
                : "Choisissez la formule adaptée à votre auto-école."}
        </p>

        {abonnement?.fin && (
          <dl className="review-list">
            <div className="review-row">
              <dt>Formule actuelle</dt>
              <dd>{abonnement.planNom ?? "—"}</dd>
            </div>
            <div className="review-row">
              <dt>{enRetard ? "Expirée le" : "Valable jusqu'au"}</dt>
              <dd>{new Date(abonnement.fin).toLocaleDateString("fr-FR", { dateStyle: "long" })}</dd>
            </div>
          </dl>
        )}

        <ChoixFormule
          formules={(formules ?? []).map((f) => ({
            id: f.id,
            nom: f.name,
            prix: f.price_fcfa,
            moniteurs: f.max_instructors,
            eleves: f.max_students,
          }))}
        />

        <p className="text-sm text-muted-color mt-8 mb-0">
          Le règlement se fait auprès de notre équipe (Wave, Orange Money ou virement). Une fois reçu, votre accès est
          rouvert immédiatement et une facture vous est délivrée.
        </p>
      </div>
    </AuthShell>
  );
}
