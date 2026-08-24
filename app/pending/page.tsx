import Link from "next/link";
import { requireProfile, isOrgStaffRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/AuthShell";
import { PageBackground, FONDS } from "@/components/PageBackground";

// The waiting room. Middleware sends anyone here whose account OR whose
// auto-école has not been approved yet, and sends them away again the moment
// both are active — so this page turns into their dashboard by itself.
export default async function PendingPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("name, status, rejection_reason")
    .eq("id", profile.organization_id ?? "")
    .maybeSingle();

  const isStaff = isOrgStaffRole(profile.role);
  const orgPending = isStaff && org?.status === "pending";
  const orgRejected = isStaff && org?.status === "rejected";
  const orgSuspended = isStaff && org?.status === "suspended";
  const accountRejected = profile.status === "rejected";

  const firstName = profile.full_name.split(" ")[0];

  return (
    <AuthShell
      background={<PageBackground image={FONDS.calme} />}
      action={
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn btn-secondary btn-sm">
            <i className="fa-solid fa-arrow-right-from-bracket"></i> Déconnexion
          </button>
        </form>
      }
    >
      <div className="auth-card auth-card-wide text-center">
        {orgRejected ? (
          <>
            <h1 className="auth-title">Demande non retenue</h1>
            <p className="auth-subtitle">
              La demande d&apos;inscription de <strong>{org?.name}</strong> n&apos;a pas été validée par notre équipe.
            </p>
            {org?.rejection_reason && (
              <div className="form-error-banner" style={{ textAlign: "left" }}>
                <strong>Motif :</strong> {org.rejection_reason}
              </div>
            )}
            <p className="text-sm text-muted-color mb-0">
              Vous pouvez corriger les informations concernées et nous contacter pour un nouvel examen de votre dossier.
            </p>
          </>
        ) : accountRejected ? (
          <>
            <h1 className="auth-title">Candidature non retenue</h1>
            <p className="auth-subtitle">
              {org?.name ?? "L'auto-école"} n&apos;a pas donné suite à votre candidature.
            </p>
            {profile.rejection_reason && (
              <div className="form-error-banner" style={{ textAlign: "left" }}>
                <strong>Motif :</strong> {profile.rejection_reason}
              </div>
            )}
            <p className="text-sm text-muted-color mb-0">
              Vous pouvez contacter directement l&apos;auto-école, ou postuler auprès d&apos;un autre établissement.
            </p>
          </>
        ) : orgSuspended ? (
          <>
            <h1 className="auth-title">Accès temporairement suspendu</h1>
            <p className="auth-subtitle">
              L&apos;accès à l&apos;espace de <strong>{org?.name}</strong> est suspendu. Contactez notre équipe pour
              rétablir votre compte.
            </p>
          </>
        ) : orgPending ? (
          <>
            <span className="badge mb-4">Bienvenue sur L&apos;Auto École</span>
            <h1 className="auth-title">Bonjour {firstName}, votre demande est bien arrivée</h1>
            <p className="auth-subtitle">
              Merci d&apos;avoir inscrit <strong>{org?.name}</strong>. Notre équipe examine votre dossier — c&apos;est
              une simple vérification, et la très grande majorité des demandes sont acceptées.
            </p>

            <div className="steps-timeline">
              <div className="step done">
                <span className="step-dot"><i className="fa-solid fa-check"></i></span>
                <div>
                  <p className="step-title">Demande envoyée</p>
                  <p className="step-help">Nous avons reçu toutes vos informations.</p>
                </div>
              </div>
              <div className="step current">
                <span className="step-dot"><i className="fa-solid fa-hourglass-half"></i></span>
                <div>
                  <p className="step-title">Vérification par notre équipe</p>
                  <p className="step-help">Nous contrôlons les informations de votre établissement.</p>
                </div>
              </div>
              <div className="step">
                <span className="step-dot"><i className="fa-solid fa-key"></i></span>
                <div>
                  <p className="step-title">Ouverture de votre espace</p>
                  <p className="step-help">
                    Vous recevrez une notification avec un lien de connexion, et vous pourrez inscrire vos élèves.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-color mb-0">
              Rien à faire de votre côté. Revenez sur cette page plus tard : elle deviendra automatiquement votre
              tableau de bord dès la validation.
            </p>
          </>
        ) : (
          <>
            <span className="badge mb-4">Candidature moniteur</span>
            <h1 className="auth-title">Bonjour {firstName}, votre candidature est en cours d&apos;examen</h1>
            <p className="auth-subtitle">
              Elle a bien été transmise à <strong>{org?.name ?? "votre auto-école"}</strong>. Vous accéderez à votre
              espace moniteur dès que la direction aura validé votre profil.
            </p>

            <div className="steps-timeline">
              <div className="step done">
                <span className="step-dot"><i className="fa-solid fa-check"></i></span>
                <div>
                  <p className="step-title">Candidature envoyée</p>
                  <p className="step-help">Votre dossier est arrivé à l&apos;auto-école.</p>
                </div>
              </div>
              <div className="step current">
                <span className="step-dot"><i className="fa-solid fa-hourglass-half"></i></span>
                <div>
                  <p className="step-title">Examen par la direction</p>
                  <p className="step-help">Elle vérifie votre agrément et votre expérience.</p>
                </div>
              </div>
              <div className="step">
                <span className="step-dot"><i className="fa-solid fa-key"></i></span>
                <div>
                  <p className="step-title">Accès à votre espace</p>
                  <p className="step-help">Vos élèves et votre planning s&apos;afficheront ici.</p>
                </div>
              </div>
            </div>

            <p className="text-sm text-muted-color mb-0">
              Rien à faire de votre côté. Cette page deviendra votre tableau de bord dès la validation.
            </p>
          </>
        )}

        <div className="flex gap-2 justify-center mt-8">
          <Link href="/" className="btn btn-secondary">Retour à l&apos;accueil</Link>
        </div>
      </div>
    </AuthShell>
  );
}
