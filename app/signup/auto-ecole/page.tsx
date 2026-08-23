"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { applyAsSchool } from "@/lib/actions/organizations";
import { AuthShell } from "@/components/AuthShell";
import { Choice, ReviewRow, WizardNav, WizardProgress, WizardStep } from "@/components/Wizard";

// Same step-by-step shape as the élève and moniteur wizards. A school's
// questionnaire is the longest of the three — it creates the tenant itself —
// so it is split into short screens rather than one wall of inputs.
const STEPS = [
  "Établissement",
  "Contact",
  "Adresse",
  "Administratif",
  "Services",
  "Tarifs",
  "Équipements",
  "Mot de passe",
  "Confirmation",
];

const SERVICE_OPTIONS = [
  { value: "permis_voiture", label: "Permis voiture" },
  { value: "poids_lourd", label: "Poids lourd" },
  { value: "transport", label: "Transport" },
  { value: "perfectionnement", label: "Perfectionnement" },
  { value: "conduite_accompagnee", label: "Conduite accompagnée" },
  { value: "cours_code", label: "Cours de code" },
  { value: "cours_pratiques", label: "Cours pratiques" },
  { value: "cours_en_ligne", label: "Cours en ligne" },
  { value: "visioconference", label: "Visioconférence" },
  { value: "examens_blancs", label: "Examens blancs" },
];

interface FormState {
  name: string;
  responsable_name: string;
  phone: string;
  email: string;
  address: string;
  quartier: string;
  city: string;
  region: string;
  description: string;
  id_number: string;
  services: string[];
  price_inscription: string;
  price_permis: string;
  price_perfectionnement: string;
  equip_vehicules: string;
  equip_simulateurs: string;
  equip_salles: string;
  password: string;
  confirmPassword: string;
  terms_accepted: boolean;
}

const initialState: FormState = {
  name: "", responsable_name: "", phone: "", email: "", address: "", quartier: "", city: "", region: "",
  description: "", id_number: "", services: [], price_inscription: "", price_permis: "", price_perfectionnement: "",
  equip_vehicules: "", equip_simulateurs: "", equip_salles: "", password: "", confirmPassword: "", terms_accepted: false,
};

function SchoolSignupForm() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleService(value: string) {
    setForm((prev) => ({
      ...prev,
      services: prev.services.includes(value) ? prev.services.filter((s) => s !== value) : [...prev.services, value],
    }));
  }

  function validateStep(): string | null {
    if (step === 0 && (!form.name.trim() || !form.responsable_name.trim())) return "Le nom de l'auto-école et celui du responsable sont requis.";
    if (step === 1 && (!form.email.trim() || !form.phone.trim())) return "L'email et le téléphone de l'auto-école sont requis.";
    if (step === 2 && !form.city.trim()) return "Merci d'indiquer au moins la ville.";
    if (step === 4 && form.services.length === 0) return "Sélectionnez au moins un service proposé.";
    if (step === 7) {
      if (form.password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
      if (form.password !== form.confirmPassword) return "Les mots de passe ne correspondent pas.";
    }
    if (step === 8 && !form.terms_accepted) return "Vous devez accepter les conditions pour continuer.";
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
    fd.set("name", form.name);
    fd.set("responsable_name", form.responsable_name);
    fd.set("phone", form.phone);
    fd.set("email", form.email);
    fd.set("address", form.address);
    fd.set("quartier", form.quartier);
    fd.set("city", form.city);
    fd.set("region", form.region);
    fd.set("description", form.description);
    fd.set("id_number", form.id_number);
    form.services.forEach((s) => fd.append("services", s));
    fd.set("price_inscription", form.price_inscription);
    fd.set("price_permis", form.price_permis);
    fd.set("price_perfectionnement", form.price_perfectionnement);
    fd.set("equip_vehicules", form.equip_vehicules);
    fd.set("equip_simulateurs", form.equip_simulateurs);
    fd.set("equip_salles", form.equip_salles);
    fd.set("password", form.password);
    fd.set("terms_accepted", "on");
    const refCode = searchParams.get("ref");
    if (refCode) fd.set("ref_code", refCode);

    const result = await applyAsSchool(fd);
    setSubmitting(false);
    if (!result.ok) { setError(result.error ?? "Une erreur est survenue."); return; }
    setDone(true);
  }

  if (done) {
    return (
      <div className="auth-card text-center">
        <div className="icon-box" style={{ margin: "0 auto 1.5rem" }}><i className="fa-solid fa-hourglass-half"></i></div>
        <h1 className="auth-title">Demande envoyée</h1>
        <p className="auth-subtitle">
          Votre auto-école sera visible sur la plateforme dès validation par notre équipe. Vous pouvez déjà vous
          connecter pour préparer vos formations pendant l&apos;examen de votre dossier.
        </p>
        <Link href="/login" className="btn btn-primary btn-lg w-full">Se connecter</Link>
      </div>
    );
  }

  return (
    <div className="auth-card auth-card-wide">
      <WizardProgress step={step} total={STEPS.length} />
      {error && <div className="form-error-banner">{error}</div>}

      {step === 0 && (
        <WizardStep label={`Étape 1 sur ${STEPS.length}`} question="Quel est le nom de votre auto-école ?" help="Le nom sous lequel vos élèves vous connaissent. Il apparaîtra dans l'annuaire des auto-écoles partenaires.">
          <div className="field">
            <label htmlFor="name">Nom de l&apos;auto-école *</label>
            <input id="name" autoFocus value={form.name} onChange={(e) => update("name", e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="responsable">Nom du responsable *</label>
            <input id="responsable" value={form.responsable_name} onChange={(e) => update("responsable_name", e.target.value)} />
          </div>
        </WizardStep>
      )}

      {step === 1 && (
        <WizardStep label={`Étape 2 sur ${STEPS.length}`} question="Comment vous joindre ?" help="Cet email deviendra l'identifiant de connexion du compte administrateur de votre auto-école.">
          <div className="field">
            <label htmlFor="email">Email *</label>
            <input id="email" type="email" autoFocus autoComplete="email" value={form.email} onChange={(e) => update("email", e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="phone">Téléphone *</label>
            <input id="phone" type="tel" placeholder="+221 7X XXX XX XX" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
          </div>
        </WizardStep>
      )}

      {step === 2 && (
        <WizardStep label={`Étape 3 sur ${STEPS.length}`} question="Où se trouve votre auto-école ?" help="L'adresse permet à vos futurs élèves de vous trouver dans l'annuaire.">
          <div className="field">
            <label htmlFor="address">Adresse</label>
            <input id="address" autoFocus value={form.address} onChange={(e) => update("address", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="quartier">Quartier</label>
            <input id="quartier" value={form.quartier} onChange={(e) => update("quartier", e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="city">Ville *</label>
              <input id="city" value={form.city} onChange={(e) => update("city", e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label htmlFor="region">Région</label>
              <input id="region" value={form.region} onChange={(e) => update("region", e.target.value)} />
            </div>
          </div>
        </WizardStep>
      )}

      {step === 3 && (
        <WizardStep label={`Étape 4 sur ${STEPS.length}`} question="Informations administratives" help="Ces informations aident notre équipe à vérifier votre établissement. Vous pourrez fournir les justificatifs après la validation initiale.">
          <div className="field">
            <label htmlFor="id-number">Numéro d&apos;identification (NINEA, registre de commerce...)</label>
            <input id="id-number" autoFocus value={form.id_number} onChange={(e) => update("id_number", e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="description">Présentation de l&apos;auto-école</label>
            <textarea id="description" rows={4} placeholder="Votre histoire, votre pédagogie, vos points forts..." value={form.description} onChange={(e) => update("description", e.target.value)} />
          </div>
        </WizardStep>
      )}

      {step === 4 && (
        <WizardStep label={`Étape 5 sur ${STEPS.length}`} question="Quels services proposez-vous ?" help="Sélectionnez tout ce que votre auto-école propose. Vous pourrez modifier cette liste plus tard.">
          <div className="choice-grid">
            {SERVICE_OPTIONS.map((s) => (
              <Choice key={s.value} multiple selected={form.services.includes(s.value)} onSelect={() => toggleService(s.value)}>
                {s.label}
              </Choice>
            ))}
          </div>
        </WizardStep>
      )}

      {step === 5 && (
        <WizardStep label={`Étape 6 sur ${STEPS.length}`} question="Quels sont vos tarifs ?" help="Indiqués en francs CFA. Laissez vide ce qui ne s'applique pas — vous pourrez ajuster vos prix à tout moment.">
          <div className="field">
            <label htmlFor="p-inscription">Prix inscription (F CFA)</label>
            <input id="p-inscription" type="number" min={0} autoFocus value={form.price_inscription} onChange={(e) => update("price_inscription", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="p-permis">Prix permis complet (F CFA)</label>
            <input id="p-permis" type="number" min={0} value={form.price_permis} onChange={(e) => update("price_permis", e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="p-perf">Prix perfectionnement (F CFA)</label>
            <input id="p-perf" type="number" min={0} value={form.price_perfectionnement} onChange={(e) => update("price_perfectionnement", e.target.value)} />
          </div>
        </WizardStep>
      )}

      {step === 6 && (
        <WizardStep label={`Étape 7 sur ${STEPS.length}`} question="De quels moyens disposez-vous ?" help="Décrivez brièvement votre parc et vos locaux. Cela rassure les élèves qui comparent les auto-écoles.">
          <div className="field">
            <label htmlFor="vehicules">Véhicules (nombre / types)</label>
            <input id="vehicules" autoFocus placeholder="Ex : 4 voitures, 2 motos" value={form.equip_vehicules} onChange={(e) => update("equip_vehicules", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="simulateurs">Simulateurs</label>
            <input id="simulateurs" value={form.equip_simulateurs} onChange={(e) => update("equip_simulateurs", e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="salles">Salles de cours</label>
            <input id="salles" value={form.equip_salles} onChange={(e) => update("equip_salles", e.target.value)} />
          </div>
        </WizardStep>
      )}

      {step === 7 && (
        <WizardStep label={`Étape 8 sur ${STEPS.length}`} question="Créez un mot de passe" help="Il protège le compte administrateur de votre auto-école. Au moins 8 caractères.">
          <div className="field">
            <label htmlFor="password">Mot de passe *</label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoFocus
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
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
          <div className="field" style={{ marginBottom: 0 }}>
            <label htmlFor="confirm">Confirmer le mot de passe *</label>
            <input id="confirm" type={showPassword ? "text" : "password"} autoComplete="new-password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} />
          </div>
        </WizardStep>
      )}

      {step === 8 && (
        <WizardStep label={`Étape 9 sur ${STEPS.length}`} question="Vérifiez votre dossier" help="Votre demande sera examinée par notre équipe. Vous pourrez vous connecter immédiatement pour préparer vos formations.">
          <dl className="review-list">
            <ReviewRow label="Auto-école" value={form.name || "—"} />
            <ReviewRow label="Responsable" value={form.responsable_name || "—"} />
            <ReviewRow label="Email" value={form.email || "—"} />
            <ReviewRow label="Téléphone" value={form.phone || "—"} />
            <ReviewRow label="Ville" value={[form.city, form.region].filter(Boolean).join(", ") || "—"} />
            <ReviewRow label="Services" value={form.services.length > 0 ? `${form.services.length} sélectionné(s)` : "—"} />
          </dl>

          <label className="choice" style={{ alignItems: "flex-start", cursor: "pointer" }}>
            <input type="checkbox" checked={form.terms_accepted} onChange={(e) => update("terms_accepted", e.target.checked)} style={{ marginTop: 3 }} />
            <span className="text-sm">
              J&apos;accepte les{" "}
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
        submitLabel="Envoyer ma demande"
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

export default function SchoolSignupPage() {
  return (
    <AuthShell action={<Link href="/signup" className="btn btn-secondary btn-sm">Changer de profil</Link>}>
      <Suspense fallback={null}>
        <SchoolSignupForm />
      </Suspense>
    </AuthShell>
  );
}
