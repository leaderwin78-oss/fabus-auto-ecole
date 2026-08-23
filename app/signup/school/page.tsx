"use client";

import { useState } from "react";
import Link from "next/link";
import { applyAsSchool } from "@/lib/actions/organizations";

const STEPS = ["Informations générales", "Informations administratives", "Services", "Tarifs", "Équipements", "Validation"];

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

export default function SchoolSignupPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
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
    if (step === 0) {
      if (!form.name || !form.responsable_name || !form.email || !form.phone) return "Merci de remplir tous les champs obligatoires.";
    }
    if (step === 5) {
      if (!form.password || form.password.length < 8) return "Le mot de passe doit contenir au moins 8 caractères.";
      if (form.password !== form.confirmPassword) return "Les mots de passe ne correspondent pas.";
      if (!form.terms_accepted) return "Vous devez accepter les conditions générales et la politique de confidentialité.";
    }
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
    if (form.terms_accepted) fd.set("terms_accepted", "on");

    const result = await applyAsSchool(fd);
    setSubmitting(false);
    if (!result.ok) setError(result.error ?? "Erreur");
    else setDone(true);
  }

  if (done) {
    return (
      <main className="flex items-center justify-center" style={{ minHeight: "100vh", padding: "2rem" }}>
        <div className="card text-center" style={{ maxWidth: 480 }}>
          <div className="icon-box" style={{ margin: "0 auto 1.5rem" }}><i className="fa-solid fa-hourglass-half"></i></div>
          <h2 className="mb-2">Demande envoyée</h2>
          <p className="text-muted-color mb-8">
            Votre auto-école sera visible sur la plateforme dès validation par notre équipe. Vous pouvez déjà vous
            connecter pour préparer vos formations pendant l&apos;examen de votre dossier.
          </p>
          <Link href="/login" className="btn btn-primary">Se connecter</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="section container" style={{ maxWidth: 700 }}>
      <h2 className="mb-2">Inscrire mon auto-école</h2>
      <p className="text-muted-color mb-8">Étape {step + 1} / {STEPS.length} — {STEPS[step]}</p>

      <div className="progress-container mb-8">
        <div className="progress-bar" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}></div>
      </div>

      {error && <div className="form-error-banner">{error}</div>}

      <div className="card">
        {step === 0 && (
          <>
            <div className="field"><label>Nom de l&apos;auto-école *</label><input value={form.name} onChange={(e) => update("name", e.target.value)} /></div>
            <div className="field"><label>Nom du responsable *</label><input value={form.responsable_name} onChange={(e) => update("responsable_name", e.target.value)} /></div>
            <div className="field"><label>Téléphone *</label><input value={form.phone} onChange={(e) => update("phone", e.target.value)} /></div>
            <div className="field"><label>Email *</label><input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></div>
            <div className="field"><label>Adresse</label><input value={form.address} onChange={(e) => update("address", e.target.value)} /></div>
            <div className="field"><label>Quartier</label><input value={form.quartier} onChange={(e) => update("quartier", e.target.value)} /></div>
            <div className="field"><label>Ville</label><input value={form.city} onChange={(e) => update("city", e.target.value)} /></div>
            <div className="field"><label>Région</label><input value={form.region} onChange={(e) => update("region", e.target.value)} /></div>
            <div className="field"><label>Description</label><textarea rows={3} value={form.description} onChange={(e) => update("description", e.target.value)} /></div>
          </>
        )}

        {step === 1 && (
          <>
            <p className="text-sm text-muted-color mb-4">
              Ces informations aident notre équipe à vérifier votre établissement. Vous pourrez fournir les
              justificatifs demandés après validation initiale si nécessaire.
            </p>
            <div className="field"><label>Numéro d&apos;identification (NINEA, registre de commerce, etc.)</label><input value={form.id_number} onChange={(e) => update("id_number", e.target.value)} /></div>
          </>
        )}

        {step === 2 && (
          <>
            <p className="text-sm text-muted-color mb-4">Sélectionnez les services proposés par votre auto-école.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              {SERVICE_OPTIONS.map((s) => (
                <label key={s.value} className="flex items-center gap-2" style={{ cursor: "pointer" }}>
                  <input type="checkbox" checked={form.services.includes(s.value)} onChange={() => toggleService(s.value)} />
                  {s.label}
                </label>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="field"><label>Prix inscription (F CFA)</label><input type="number" min={0} value={form.price_inscription} onChange={(e) => update("price_inscription", e.target.value)} /></div>
            <div className="field"><label>Prix permis complet (F CFA)</label><input type="number" min={0} value={form.price_permis} onChange={(e) => update("price_permis", e.target.value)} /></div>
            <div className="field"><label>Prix perfectionnement (F CFA)</label><input type="number" min={0} value={form.price_perfectionnement} onChange={(e) => update("price_perfectionnement", e.target.value)} /></div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="field"><label>Véhicules (nombre / types)</label><input value={form.equip_vehicules} onChange={(e) => update("equip_vehicules", e.target.value)} /></div>
            <div className="field"><label>Simulateurs</label><input value={form.equip_simulateurs} onChange={(e) => update("equip_simulateurs", e.target.value)} /></div>
            <div className="field"><label>Salles de cours</label><input value={form.equip_salles} onChange={(e) => update("equip_salles", e.target.value)} /></div>
          </>
        )}

        {step === 5 && (
          <>
            <h4 className="mb-4">Récapitulatif</h4>
            <p className="text-sm mb-2"><strong>{form.name}</strong> — {form.responsable_name}</p>
            <p className="text-sm mb-2">{form.email} • {form.phone}</p>
            <p className="text-sm mb-4">{form.city}{form.region ? `, ${form.region}` : ""}</p>
            <p className="text-sm mb-8">Services : {form.services.length > 0 ? form.services.join(", ") : "aucun sélectionné"}</p>

            <div className="field"><label>Mot de passe du compte administrateur *</label><input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} /></div>
            <div className="field"><label>Confirmer le mot de passe *</label><input type="password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} /></div>

            <label className="flex items-center gap-2 mb-4" style={{ cursor: "pointer" }}>
              <input type="checkbox" checked={form.terms_accepted} onChange={(e) => update("terms_accepted", e.target.checked)} />
              <span className="text-sm">
                J&apos;accepte les <Link href="/conditions" style={{ color: "var(--fabus-green)" }}>conditions générales</Link> et la{" "}
                <Link href="/confidentialite" style={{ color: "var(--fabus-green)" }}>politique de confidentialité</Link>.
              </span>
            </label>
          </>
        )}

        <div className="flex justify-between mt-8">
          <button className="btn btn-secondary" onClick={back} disabled={step === 0 || submitting}>Précédent</button>
          {step < STEPS.length - 1 ? (
            <button className="btn btn-primary" onClick={next}>Suivant</button>
          ) : (
            <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting || !form.terms_accepted}>
              {submitting ? "Envoi..." : "Créer mon compte"}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
