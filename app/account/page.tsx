import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "./PasswordForm";
import { AvatarUpload } from "./AvatarUpload";
import { TwoFactorSection } from "./TwoFactorSection";
import { SocialLinksForm } from "./SocialLinksForm";
import { ReferralWidget } from "./ReferralWidget";
import { CoverUpload } from "./CoverUpload";
import { BackgroundPicker } from "./BackgroundPicker";

const ROLE_HOME: Record<string, string> = {
  super_admin: "/super-admin",
  admin: "/admin",
  admin_auto_ecole: "/admin",
  instructor: "/instructor",
  student: "/student",
};

// Une ligne de gain : on affiche la base et le taux, pas seulement le montant.
// Quelqu'un qui touche de l'argent doit pouvoir refaire le calcul lui-même.
function ReferralEarningRow({
  date, base, taux, montant, statut,
}: { date: string; base: number; taux: number; montant: number; statut: string }) {
  return (
    <div className="review-row">
      <dt>
        {date} — {base.toLocaleString("fr-FR")} F × {taux} %
        {statut === "verse" && <span className="badge ml-2" style={{ marginLeft: 8 }}>versé</span>}
      </dt>
      <dd style={{ color: "var(--accent-text)" }}>+{montant.toLocaleString("fr-FR")} F</dd>
    </div>
  );
}

export default async function AccountPage() {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const [{ data: gainsData }, { data: reglages }] = await Promise.all([
    supabase
      .from("referral_earnings")
      .select("id, amount_fcfa, base_amount_fcfa, rate_percent, status, created_at")
      .eq("referrer_id", userId)
      .order("created_at", { ascending: false }),
    // Le taux affiché vient de la même source que le calcul, jamais d'une
    // constante recopiée : sinon l'affichage et la réalité divergent le jour
    // où le super admin change le taux.
    createAdminClient().from("platform_settings").select("referral_commission_percent").eq("id", true).single(),
  ]);

  const gains = gainsData ?? [];
  const totalGains = gains.reduce((somme, g) => somme + g.amount_fcfa, 0);
  const tauxParrainage = Number(reglages?.referral_commission_percent ?? 10);

  return (
    <main className="section container" style={{ maxWidth: 700 }}>
      <Link href={ROLE_HOME[profile.role] ?? "/dashboard"} className="text-sm text-muted-color mb-4" style={{ display: "inline-block" }}>
        <i className="fa-solid fa-arrow-left"></i> Retour au tableau de bord
      </Link>
      <h2 className="mb-8">Mon compte</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="card">
          <h4 className="mb-4">Photo de couverture</h4>
          <CoverUpload coverUrl={profile.cover_url} />
        </div>

        <div className="card">
          <h4 className="mb-4">Photo de profil</h4>
          <AvatarUpload avatarUrl={profile.avatar_url} fullName={profile.full_name} />
        </div>

        <div className="card">
          <h4 className="mb-4">Mon fond d&apos;écran</h4>
          <BackgroundPicker actuel={profile.background_key} />
        </div>

        <div className="card">
          <h4 className="mb-4">Informations personnelles</h4>
          <ProfileForm fullName={profile.full_name} phone={profile.phone} />
        </div>

        <div className="card">
          <h4 className="mb-4">Réseaux sociaux</h4>
          <SocialLinksForm links={profile.social_links ?? {}} isPublic={profile.social_links_public ?? false} />
        </div>

        <div className="card">
          <h4 className="mb-2">Parrainage</h4>
          <p className="text-sm text-muted-color mb-4">
            Vous touchez <strong>{tauxParrainage} %</strong> du montant de l&apos;inscription de chaque personne que
            vous parrainez, dès qu&apos;elle règle son inscription.
          </p>

          <div className="grid grid-cols-2 mb-4" style={{ gap: "0.75rem" }}>
            <div className="card-flat" style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-md)" }}>
              <div className="stat-value" style={{ fontSize: "1.5rem", color: "var(--accent-text)" }}>
                {totalGains.toLocaleString("fr-FR")} F
              </div>
              <div className="stat-label">Gains acquis</div>
            </div>
            <div className="card-flat" style={{ background: "var(--bg-secondary)", borderRadius: "var(--radius-md)" }}>
              <div className="stat-value" style={{ fontSize: "1.5rem" }}>{gains.length}</div>
              <div className="stat-label">Filleul(s) ayant payé</div>
            </div>
          </div>

          {gains.length > 0 && (
            <dl className="review-list">
              {gains.slice(0, 5).map((g) => (
                <ReferralEarningRow
                  key={g.id}
                  date={new Date(g.created_at).toLocaleDateString("fr-FR")}
                  base={g.base_amount_fcfa}
                  taux={Number(g.rate_percent)}
                  montant={g.amount_fcfa}
                  statut={g.status}
                />
              ))}
            </dl>
          )}

          <ReferralWidget />
        </div>

        <div className="card">
          <h4 className="mb-4">Mot de passe</h4>
          <PasswordForm />
        </div>

        <div className="card">
          <h4 className="mb-4">Authentification à deux facteurs (2FA)</h4>
          <TwoFactorSection />
        </div>
      </div>
    </main>
  );
}
