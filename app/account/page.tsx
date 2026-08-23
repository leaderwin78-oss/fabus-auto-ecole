import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { ProfileForm } from "./ProfileForm";
import { PasswordForm } from "./PasswordForm";
import { AvatarUpload } from "./AvatarUpload";
import { TwoFactorSection } from "./TwoFactorSection";
import { SocialLinksForm } from "./SocialLinksForm";
import { ReferralWidget } from "./ReferralWidget";

const ROLE_HOME: Record<string, string> = {
  super_admin: "/super-admin",
  admin: "/admin",
  admin_auto_ecole: "/admin",
  instructor: "/instructor",
  student: "/student",
};

export default async function AccountPage() {
  const { profile } = await requireProfile();

  return (
    <main className="section container" style={{ maxWidth: 700 }}>
      <Link href={ROLE_HOME[profile.role] ?? "/dashboard"} className="text-sm text-muted-color mb-4" style={{ display: "inline-block" }}>
        <i className="fa-solid fa-arrow-left"></i> Retour au tableau de bord
      </Link>
      <h2 className="mb-8">Mon compte</h2>

      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="card">
          <h4 className="mb-4">Photo de profil</h4>
          <AvatarUpload avatarUrl={profile.avatar_url} fullName={profile.full_name} />
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
          <h4 className="mb-4">Inviter un ami</h4>
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
