import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { PageBackground, FONDS } from "@/components/PageBackground";

// /signup is now a door chooser rather than a form. The three profiles need
// genuinely different questionnaires (a moniteur has a licence number, a
// school has premises and prices, a student has neither), and asking "who are
// you?" once up front is what lets each wizard stay short.
export default async function SignupRolePage({
  searchParams,
}: {
  searchParams: Promise<{ school?: string; ref?: string }>;
}) {
  const { school, ref } = await searchParams;

  // Carry the deep-link context (a school picked from the directory, a
  // referral code from an invitation) into whichever wizard is chosen.
  const query = new URLSearchParams();
  if (school) query.set("school", school);
  if (ref) query.set("ref", ref);
  const suffix = query.toString() ? `?${query.toString()}` : "";

  const roles = [
    {
      href: `/signup/eleve${suffix}`,
      photo: FONDS.salleEleves,
      portrait: "eleve",
      title: "Élève",
      description:
        "Je veux passer mon permis : réviser le code en ligne, réserver mes heures de conduite et suivre mon dossier.",
      cta: "Créer mon compte élève",
    },
    {
      href: `/signup/auto-ecole${suffix}`,
      photo: FONDS.ville,
      portrait: "auto-ecole",
      title: "Auto-école",
      description:
        "Je dirige une auto-école et je veux gérer mes élèves, mes moniteurs, mes cours et mes paiements sur la plateforme.",
      cta: "Inscrire mon auto-école",
    },
    {
      href: `/signup/moniteur${suffix}`,
      photo: FONDS.moniteur,
      portrait: "moniteur",
      title: "Moniteur",
      description:
        "Je suis moniteur d'auto-école et je veux rejoindre l'équipe d'une auto-école déjà inscrite sur la plateforme.",
      cta: "Rejoindre une auto-école",
    },
  ];

  return (
    <AuthShell
      background={<PageBackground image={FONDS.route} />}
      action={
        <Link href="/login" className="btn btn-secondary btn-sm">
          Se connecter
        </Link>
      }
    >
      <div style={{ width: "100%", maxWidth: 980 }}>
        <div className="text-center mb-8">
          <h1 className="auth-title" style={{ fontSize: "2rem" }}>
            Créer un compte
          </h1>
          <p className="auth-subtitle" style={{ marginBottom: 0 }}>
            Pour commencer, dites-nous qui vous êtes.
          </p>
        </div>

        <div className="role-grid">
          {roles.map((role) => (
            <Link key={role.href} href={role.href} className="role-card">
              <span
                className="role-photo"
                aria-hidden="true"
                style={{ backgroundImage: `url(/images/bg/${role.photo}@800.webp)` }}
              />
              <div className="role-portrait">
                {/* eslint-disable-next-line @next/next/no-img-element -- fusion « écran », incompatible avec l'optimisation de next/image */}
                <img src={`/images/personnes/${role.portrait}@small.webp`} alt="" aria-hidden="true" />
              </div>
              <h3>{role.title}</h3>
              <p>{role.description}</p>
              <span className="role-cta">
                {role.cta} <i className="fa-solid fa-arrow-right" style={{ fontSize: "0.75rem" }}></i>
              </span>
            </Link>
          ))}
        </div>

        <p className="auth-footer-link">
          Vous avez déjà un compte ? <Link href="/login">Se connecter</Link>
        </p>
      </div>
    </AuthShell>
  );
}
