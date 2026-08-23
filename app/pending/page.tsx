import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/AuthShell";

// Where a self-registered moniteur lands until their school decides. Middleware
// sends every non-active account here; RLS is what actually keeps the school's
// data out of reach.
export default async function PendingPage() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  // organizations_select still lets a pending member read their own school row
  // (name only, no sensitive columns) so this page can name who is reviewing.
  const { data: org } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", profile.organization_id ?? "")
    .maybeSingle();

  const rejected = profile.status === "rejected";

  return (
    <AuthShell
      action={
        <form action="/auth/signout" method="post">
          <button type="submit" className="btn btn-secondary btn-sm">
            <i className="fa-solid fa-arrow-right-from-bracket"></i> Déconnexion
          </button>
        </form>
      }
    >
      <div className="auth-card text-center">
        <div className="icon-box" style={{ margin: "0 auto 1.5rem" }}>
          <i className={`fa-solid ${rejected ? "fa-circle-xmark" : "fa-hourglass-half"}`}></i>
        </div>

        {rejected ? (
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
            <p className="text-sm text-muted-color">
              Vous pouvez contacter directement l&apos;auto-école, ou créer une nouvelle candidature auprès d&apos;un
              autre établissement.
            </p>
          </>
        ) : (
          <>
            <h1 className="auth-title">Candidature en cours d&apos;examen</h1>
            <p className="auth-subtitle">
              Bonjour {profile.full_name.split(" ")[0]}, votre candidature a bien été transmise à{" "}
              <strong>{org?.name ?? "votre auto-école"}</strong>. Vous recevrez l&apos;accès à votre espace moniteur dès
              que la direction aura validé votre profil.
            </p>
            <div className="card-flat" style={{ background: "var(--bg-secondary)", textAlign: "left", borderRadius: "var(--radius-md)" }}>
              <p className="text-sm mb-2" style={{ fontWeight: 500 }}>En attendant</p>
              <p className="text-sm text-muted-color mb-0">
                Rien à faire de votre côté. Reconnectez-vous plus tard pour vérifier l&apos;état de votre candidature —
                cette page se transformera automatiquement en tableau de bord une fois votre profil validé.
              </p>
            </div>
          </>
        )}

        <div className="flex gap-2 justify-center mt-8">
          <Link href="/" className="btn btn-secondary">Retour à l&apos;accueil</Link>
        </div>
      </div>
    </AuthShell>
  );
}
