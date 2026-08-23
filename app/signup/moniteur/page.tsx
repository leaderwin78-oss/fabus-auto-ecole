"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { applyAsInstructor } from "@/lib/actions/signup";
import { AuthShell } from "@/components/AuthShell";
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
import { SignupInstructorIllustration } from "@/components/illustrations/Illustrations";
import type { Organization } from "@/types/database";

// Same one-question-per-screen shape as the student wizard, plus the
// professional step a moniteur needs. Unlike a student, this account is not
// active on submit: it is a job application to a specific school, and the
// school's owner approves it from /admin/instructors.
const STEPS = ["Identité", "Naissance", "Genre", "Auto-école", "Profil pro", "Contact", "Mot de passe", "Confirmation"];

const CATEGORIES = [
  { value: "A", label: "A — Moto" },
  { value: "B", label: "B — Voiture" },
  { value: "C", label: "C — Poids lourd" },
  { value: "D", label: "D — Transport en commun" },
  { value: "E", label: "E — Remorque" },
  { value: "F", label: "F — Véhicule aménagé" },
];

function InstructorSignupForm() {
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
  const [licenseNumber, setLicenseNumber] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [bio, setBio] = useState("");
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

  function toggleCategory(value: string) {
    setCategories((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
  }

  function validateStep(): string | null {
    if (step === 0 && (!firstName.trim() || !lastName.trim())) return "Merci d'indiquer votre prénom et votre nom.";
    if (step === 1 && !toIsoDate(birth)) return "Merci d'indiquer votre date de naissance complète.";
    if (step === 2 && !gender) return "Merci de sélectionner une réponse.";
    if (step === 3 && !organizationId) return "Merci de choisir l'auto-école que vous souhaitez rejoindre.";
    if (step === 4) {
      if (!licenseNumber.trim()) return "Votre numéro d'agrément / permis est requis.";
      if (categories.length === 0) return "Sélectionnez au moins une catégorie que vous enseignez.";
    }
    if (step === 5 && !email.trim()) return "Merci d'indiquer votre adresse email.";
    if (step === 6 && password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
    if (step === 7 && !termsAccepted) return "Vous devez accepter les conditions pour continuer.";
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
    fd.set("license_number", licenseNumber.trim());
    fd.set("years_experience", yearsExperience);
    categories.forEach((c) => fd.append("teaching_categories", c));
    fd.set("bio", bio.trim());
    fd.set("email", email.trim());
    fd.set("phone", phone.trim());
    fd.set("password", password);
    fd.set("terms_accepted", "on");
    const refCode = searchParams.get("ref");
    if (refCode) fd.set("ref_code", refCode);

    const result = await applyAsInstructor(fd);
    setSubmitting(false);
    if (!result.ok) { setError(result.error ?? "Une erreur est survenue."); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="auth-card text-center">
        <div className="icon-box" style={{ margin: "0 auto 1.5rem" }}><i className="fa-solid fa-hourglass-half"></i></div>
        <h1 className="auth-title">Candidature envoyée</h1>
        <p className="auth-subtitle">
          Votre compte a bien été créé et votre candidature transmise à{" "}
          <strong>{selectedSchool?.name ?? "l'auto-école"}</strong>. Vous pourrez accéder à votre espace moniteur dès
          que la direction aura validé votre profil.
        </p>
        <Link href="/login" className="btn btn-primary btn-lg w-full">Se connecter</Link>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <WizardProgress step={step} total={STEPS.length} />
      {error && <div className="form-error-banner">{error}</div>}

      {step === 0 && (
        <WizardStep label={`Étape 1 sur ${STEPS.length}`} question="Comment vous appelez-vous ?" help="Indiquez votre nom officiel : il sera vérifié par l'auto-école et figurera sur les fiches de suivi de vos élèves.">
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
        <WizardStep label={`Étape 2 sur ${STEPS.length}`} question="Quelle est votre date de naissance ?" help="Elle fait partie des informations vérifiées par l'auto-école lors de votre recrutement.">
          <BirthDateSelects value={birth} onChange={setBirth} />
        </WizardStep>
      )}

      {step === 2 && (
        <WizardStep label={`Étape 3 sur ${STEPS.length}`} question="Quel est votre genre ?" help="Vous pouvez choisir de ne pas le préciser.">
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
        <WizardStep label={`Étape 4 sur ${STEPS.length}`} question="Quelle auto-école souhaitez-vous rejoindre ?" help="Votre candidature sera envoyée à la direction de cette auto-école, qui validera votre profil.">
          {!schoolsLoaded ? (
            <p className="text-sm text-muted-color">Chargement des auto-écoles...</p>
          ) : schools.length === 0 ? (
            <div className="card empty-state">
              <p className="mb-0">Aucune auto-école active pour l&apos;instant.</p>
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
        <WizardStep label={`Étape 5 sur ${STEPS.length}`} question="Parlez-nous de votre expérience" help="Ces informations permettent à l'auto-école d'étudier votre candidature.">
          <div className="field">
            <label htmlFor="license">Numéro d&apos;agrément / de permis *</label>
            <input id="license" autoFocus value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="years">Années d&apos;expérience</label>
            <input id="years" type="number" min={0} max={60} value={yearsExperience} onChange={(e) => setYearsExperience(e.target.value)} />
          </div>
          <div className="field">
            <label>Catégories que vous enseignez *</label>
            <div className="choice-grid">
              {CATEGORIES.map((c) => (
                <Choice key={c.value} multiple selected={categories.includes(c.value)} onSelect={() => toggleCategory(c.value)}>
                  {c.label}
                </Choice>
              ))}
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="bio">Présentation (facultatif)</label>
            <textarea id="bio" rows={3} placeholder="Parcours, spécialités, langues parlées..." value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
        </WizardStep>
      )}

      {step === 5 && (
        <WizardStep label={`Étape 6 sur ${STEPS.length}`} question="Comment vous joindre ?" help="Votre email sert d'identifiant de connexion. L'auto-école utilisera votre téléphone pour organiser les séances.">
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

      {step === 6 && (
        <WizardStep label={`Étape 7 sur ${STEPS.length}`} question="Créez un mot de passe" help="Choisissez au moins 8 caractères, avec des lettres, des chiffres et des symboles.">
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

      {step === 7 && (
        <WizardStep label={`Étape 8 sur ${STEPS.length}`} question="Vérifiez votre candidature" help="Votre compte sera créé immédiatement, mais l'accès à l'espace moniteur s'ouvrira après validation par l'auto-école.">
          <dl className="review-list">
            <ReviewRow label="Nom" value={`${firstName} ${lastName}`.trim() || "—"} />
            <ReviewRow label="Date de naissance" value={formatBirthDate(birth)} />
            <ReviewRow label="Genre" value={GENDER_OPTIONS.find((g) => g.value === gender)?.label ?? "—"} />
            <ReviewRow label="Auto-école" value={selectedSchool?.name ?? "—"} />
            <ReviewRow label="Numéro d'agrément" value={licenseNumber || "—"} />
            <ReviewRow label="Expérience" value={yearsExperience ? `${yearsExperience} an(s)` : "—"} />
            <ReviewRow label="Catégories" value={categories.length > 0 ? categories.join(", ") : "—"} />
            <ReviewRow label="Email" value={email || "—"} />
            <ReviewRow label="Téléphone" value={phone || "—"} />
          </dl>

          <label className="choice" style={{ alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} style={{ marginTop: 3 }} />
            <span className="text-sm">
              En envoyant ma candidature, j&apos;accepte les{" "}
              <Link href="/conditions" style={{ color: "var(--fabus-green)", fontWeight: 500 }}>conditions générales</Link> et la{" "}
              <Link href="/confidentialite" style={{ color: "var(--fabus-green)", fontWeight: 500 }}>politique de confidentialité</Link>.
            </span>
          </label>
        </WizardStep>
      )}

      <WizardNav
        step={step}
        isLast={step === STEPS.length - 1}
        submitting={submitting}
        submitLabel="Envoyer ma candidature"
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

export default function InstructorSignupPage() {
  return (
    <AuthShell action={<Link href="/signup" className="btn btn-secondary btn-sm">Changer de profil</Link>}>
      <div className="auth-split">
        <Suspense fallback={null}>
          <InstructorSignupForm />
        </Suspense>
        <aside className="auth-aside">
          <SignupInstructorIllustration />
          <p>
            Rejoignez une auto-école partenaire, gérez votre planning de séances et suivez la progression de vos
            élèves.
          </p>
        </aside>
      </div>
    </AuthShell>
  );
}
