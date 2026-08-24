"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerStudent } from "@/lib/actions/signup";
import { AuthShell } from "@/components/AuthShell";
import { PageBackground, FONDS } from "@/components/PageBackground";
import {
  BirthDateSelects,
  Choice,
  GENDER_OPTIONS,
  ReviewRow,
  WizardNav,
  WizardProgress,
  WizardStep,
  formatBirthDate,
  toIsoDate,
} from "@/components/Wizard";
import { SignupStudentIllustration } from "@/components/illustrations/Illustrations";
import type { Organization } from "@/types/database";

// Adapted from Facebook's mobile signup: identity first (name, birthday,
// gender), then the contact method, then the password, then consent — one
// question per screen. The school picker is the step Facebook doesn't have and
// we do, because a student account only means something inside a school.
const STEPS = ["Identité", "Naissance", "Genre", "Auto-école", "Contact", "Mot de passe", "Confirmation"];

function StudentSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [schools, setSchools] = useState<Organization[]>([]);
  const [schoolsLoaded, setSchoolsLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birth, setBirth] = useState({ day: "", month: "", year: "" });
  const [gender, setGender] = useState("");
  const [organizationId, setOrganizationId] = useState(searchParams.get("school") ?? "");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("organizations")
      .select("*")
      .eq("status", "active")
      .order("name")
      .then(({ data }) => {
        setSchools(data ?? []);
        setSchoolsLoaded(true);
      });
  }, []);

  const selectedSchool = schools.find((s) => s.id === organizationId);

  function validateStep(): string | null {
    if (step === 0 && (!firstName.trim() || !lastName.trim())) return "Merci d'indiquer votre prénom et votre nom.";
    if (step === 1 && !toIsoDate(birth)) return "Merci d'indiquer votre date de naissance complète.";
    if (step === 2 && !gender) return "Merci de sélectionner une réponse.";
    if (step === 3 && !organizationId) return "Merci de choisir votre auto-école.";
    if (step === 4 && !email.trim()) return "Merci d'indiquer votre adresse email.";
    if (step === 5 && password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
    if (step === 6 && !termsAccepted) return "Vous devez accepter les conditions pour continuer.";
    return null;
  }

  function next() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function handleSubmit() {
    const err = validateStep();
    if (err) { setError(err); return; }
    setError(null);
    setSubmitting(true);

    const fd = new FormData();
    fd.set("full_name", `${firstName.trim()} ${lastName.trim()}`);
    fd.set("birth_date", toIsoDate(birth));
    fd.set("gender", gender);
    fd.set("organization_id", organizationId);
    fd.set("email", email.trim());
    fd.set("phone", phone.trim());
    fd.set("password", password);
    fd.set("terms_accepted", "on");
    const refCode = searchParams.get("ref");
    if (refCode) fd.set("ref_code", refCode);

    const result = await registerStudent(fd);
    if (!result.ok) {
      setError(result.error ?? "Une erreur est survenue.");
      setSubmitting(false);
      return;
    }

    // The account exists and is confirmed server-side, so sign straight in —
    // no confirmation email round-trip standing between signup and the app.
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setSubmitting(false);
    if (signInError) { setDone(true); return; }

    router.push("/student");
    router.refresh();
  }

  if (done) {
    return (
      <div className="auth-card text-center">
        <div className="icon-box" style={{ margin: "0 auto 1.5rem" }}><i className="fa-solid fa-circle-check"></i></div>
        <h1 className="auth-title">Compte créé</h1>
        <p className="auth-subtitle">Votre compte élève est prêt. Connectez-vous pour accéder à votre espace.</p>
        <Link href="/login" className="btn btn-primary btn-lg w-full">Se connecter</Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <WizardProgress step={step} total={STEPS.length} />
      {error && <div className="form-error-banner">{error}</div>}

      {step === 0 && (
        <WizardStep label={`Étape 1 sur ${STEPS.length}`} question="Comment vous appelez-vous ?" help="Indiquez le nom que vous utilisez dans la vie réelle. Il apparaîtra sur votre dossier et vos attestations.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="first-name">Prénom</label>
              <input id="first-name" autoFocus autoComplete="given-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="last-name">Nom</label>
              <input id="last-name" autoComplete="family-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
        </WizardStep>
      )}

      {step === 1 && (
        <WizardStep label={`Étape 2 sur ${STEPS.length}`} question="Quelle est votre date de naissance ?" help="Votre auto-école en a besoin pour constituer votre dossier de permis. Vous devez avoir au moins 16 ans pour créer un compte.">
          <BirthDateSelects value={birth} onChange={setBirth} />
        </WizardStep>
      )}

      {step === 2 && (
        <WizardStep label={`Étape 3 sur ${STEPS.length}`} question="Quel est votre genre ?" help="Cette information figure sur les documents administratifs du permis. Vous pouvez choisir de ne pas la préciser.">
          <div className="choice-list">
            {GENDER_OPTIONS.map((option) => (
              <Choice key={option.value} selected={gender === option.value} onSelect={() => setGender(option.value)}>
                {option.label}
              </Choice>
            ))}
          </div>
        </WizardStep>
      )}

      {step === 3 && (
        <WizardStep label={`Étape 4 sur ${STEPS.length}`} question="Quelle auto-école rejoignez-vous ?" help="Choisissez l'auto-école qui suivra votre formation. Vous pourrez consulter les cours des autres auto-écoles depuis votre espace.">
          {!schoolsLoaded ? (
            <p className="text-sm text-muted-color">Chargement des auto-écoles...</p>
          ) : schools.length === 0 ? (
            <div className="card empty-state">
              <p className="mb-2">Aucune auto-école active pour l&apos;instant.</p>
              <Link href="/signup/auto-ecole" className="btn btn-secondary btn-sm">Inscrire une auto-école</Link>
            </div>
          ) : (
            <div className="choice-list" style={{ maxHeight: 320, overflowY: "auto" }}>
              {schools.map((school) => (
                <Choice key={school.id} selected={organizationId === school.id} onSelect={() => setOrganizationId(school.id)}>
                  <span style={{ fontWeight: 500 }}>{school.name}</span>
                  {school.city && <span className="text-sm text-muted-color"> — {school.city}</span>}
                </Choice>
              ))}
            </div>
          )}
        </WizardStep>
      )}

      {step === 4 && (
        <WizardStep label={`Étape 5 sur ${STEPS.length}`} question="Comment vous joindre ?" help="Votre email sert d'identifiant de connexion. Le téléphone permet à votre auto-école de vous prévenir avant vos séances de conduite.">
          <div className="field">
            <label htmlFor="email">Adresse email</label>
            <input id="email" type="email" autoFocus autoComplete="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="phone">Téléphone (facultatif)</label>
            <input id="phone" type="tel" autoComplete="tel" placeholder="+221 7X XXX XX XX" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
        </WizardStep>
      )}

      {step === 5 && (
        <WizardStep label={`Étape 6 sur ${STEPS.length}`} question="Créez un mot de passe" help="Choisissez au moins 8 caractères, avec des lettres, des chiffres et des symboles.">
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="password">Mot de passe</label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoFocus
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: "100%", paddingRight: "2.75rem" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "0.5rem" }}
              >
                <i className={`fa-regular ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
              </button>
            </div>
          </div>
        </WizardStep>
      )}

      {step === 6 && (
        <WizardStep label={`Étape 7 sur ${STEPS.length}`} question="Vérifiez vos informations" help="Relisez avant de créer votre compte. Vous pourrez modifier ces informations plus tard depuis Mon compte.">
          <dl className="review-list">
            <ReviewRow label="Nom" value={`${firstName} ${lastName}`.trim() || "—"} />
            <ReviewRow label="Date de naissance" value={formatBirthDate(birth)} />
            <ReviewRow label="Genre" value={GENDER_OPTIONS.find((g) => g.value === gender)?.label ?? "—"} />
            <ReviewRow label="Auto-école" value={selectedSchool?.name ?? "—"} />
            <ReviewRow label="Email" value={email || "—"} />
            <ReviewRow label="Téléphone" value={phone || "—"} />
          </dl>

          <label className="choice" style={{ alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} style={{ marginTop: 3 }} />
            <span className="text-sm">
              En créant un compte, j&apos;accepte les{" "}
              <Link href="/conditions" style={{ color: "var(--accent-text)", fontWeight: 500 }}>conditions générales</Link> et la{" "}
              <Link href="/confidentialite" style={{ color: "var(--accent-text)", fontWeight: 500 }}>politique de confidentialité</Link>.
            </span>
          </label>
        </WizardStep>
      )}

      <WizardNav
        step={step}
        isLast={step === STEPS.length - 1}
        submitting={submitting}
        submitLabel="Créer mon compte"
        onBack={back}
        onNext={next}
        onSubmit={handleSubmit}
      />

      <p className="auth-footer-link">
        Vous avez déjà un compte ? <Link href="/login">Se connecter</Link>
      </p>
    </div>
  );
}

export default function StudentSignupPage() {
  return (
    <AuthShell background={<PageBackground image={FONDS.salleEleves} />} action={<Link href="/signup" className="btn btn-secondary btn-sm">Changer de profil</Link>}>
      <div className="auth-split">
        <Suspense fallback={null}>
          <StudentSignupForm />
        </Suspense>
        <aside className="auth-aside">
          <SignupStudentIllustration />
          <p>
            Révisez le code depuis votre téléphone, réservez vos heures de conduite et suivez votre dossier de permis
            en direct.
          </p>
        </aside>
      </div>
    </AuthShell>
  );
}
