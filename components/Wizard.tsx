"use client";

import Link from "next/link";

// Presentation pieces shared by the three signup wizards. Each step shows one
// question at a time with a large heading, a short helper line and a single
// primary action — the pattern Facebook's mobile signup uses, adapted to the
// fields each of our profiles actually needs.

export function WizardProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="wizard-progress" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={total}>
      <span style={{ width: `${((step + 1) / total) * 100}%` }} />
    </div>
  );
}

export function WizardStep({
  label,
  question,
  help,
  children,
}: {
  label: string;
  question: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="wizard-step-label">{label}</p>
      <h1 className="wizard-question">{question}</h1>
      {help && <p className="wizard-help">{help}</p>}
      {children}
    </div>
  );
}

export function WizardNav({
  step,
  isLast,
  submitting,
  submitLabel,
  onBack,
  onNext,
  onSubmit,
  nextDisabled,
  backHref = "/signup",
}: {
  step: number;
  isLast: boolean;
  submitting: boolean;
  submitLabel: string;
  onBack: () => void;
  onNext: () => void;
  onSubmit: () => void;
  nextDisabled?: boolean;
  /** Où mène le retour depuis la première étape (par défaut le choix de profil). */
  backHref?: string;
}) {
  return (
    <div className="wizard-nav">
      {/* À la première étape le retour ne doit pas disparaître : il ramène au
          choix de profil. Un bouton mort à cet endroit donne l'impression
          d'être piégé dans le formulaire. */}
      {step === 0 ? (
        <Link href={backHref} className="wizard-back">
          <i className="fa-solid fa-arrow-left"></i> Retour
        </Link>
      ) : (
        <button type="button" className="wizard-back" onClick={onBack} disabled={submitting}>
          <i className="fa-solid fa-arrow-left"></i> Retour
        </button>
      )}
      {isLast ? (
        <button type="button" className="btn btn-primary btn-lg btn-pulse btn-shine" onClick={onSubmit} disabled={submitting || nextDisabled}>
          {submitting ? "Envoi..." : submitLabel}
        </button>
      ) : (
        <button type="button" className="btn btn-primary btn-lg btn-shine btn-arrow" onClick={onNext} disabled={submitting || nextDisabled}>
          Suivant <i className="fa-solid fa-arrow-right" style={{ fontSize: "0.75rem" }}></i>
        </button>
      )}
    </div>
  );
}

// Large tappable radio row — used for gender, licence categories and school
// selection, where a native <select> would feel cramped on a phone.
export function Choice({
  selected,
  onSelect,
  children,
  multiple = false,
}: {
  selected: boolean;
  onSelect: () => void;
  children: React.ReactNode;
  multiple?: boolean;
}) {
  return (
    <button type="button" className={`choice${selected ? " selected" : ""}`} onClick={onSelect}>
      <i
        className={
          multiple
            ? `fa-${selected ? "solid fa-square-check" : "regular fa-square"}`
            : `fa-${selected ? "solid fa-circle-dot" : "regular fa-circle"}`
        }
        style={{ color: selected ? "var(--fabus-green)" : "var(--text-muted)" }}
      ></i>
      <span style={{ flex: 1 }}>{children}</span>
    </button>
  );
}

const MONTHS = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

// Three dropdowns rather than <input type="date">: it is what Facebook uses,
// it avoids the browser's locale-dependent date widget, and it is far easier
// to fill on a phone. Emits an ISO YYYY-MM-DD string once all three are set.
export function BirthDateSelects({
  value,
  onChange,
}: {
  value: { day: string; month: string; year: string };
  onChange: (next: { day: string; month: string; year: string }) => void;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 90 }, (_, i) => currentYear - 14 - i);
  const daysInMonth =
    value.month && value.year
      ? new Date(Number(value.year), Number(value.month), 0).getDate()
      : 31;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr 1fr", gap: "0.5rem" }}>
      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="birth-day">Jour</label>
        <select id="birth-day" value={value.day} onChange={(e) => onChange({ ...value, day: e.target.value })}>
          <option value="">Jour</option>
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <option key={d} value={String(d)}>{d}</option>
          ))}
        </select>
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="birth-month">Mois</label>
        <select id="birth-month" value={value.month} onChange={(e) => onChange({ ...value, month: e.target.value })}>
          <option value="">Mois</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={String(i + 1)}>{m}</option>
          ))}
        </select>
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label htmlFor="birth-year">Année</label>
        <select id="birth-year" value={value.year} onChange={(e) => onChange({ ...value, year: e.target.value })}>
          <option value="">Année</option>
          {years.map((y) => (
            <option key={y} value={String(y)}>{y}</option>
          ))}
        </select>
      </div>
    </div>
  );
}

export function toIsoDate(value: { day: string; month: string; year: string }): string {
  if (!value.day || !value.month || !value.year) return "";
  return `${value.year}-${value.month.padStart(2, "0")}-${value.day.padStart(2, "0")}`;
}

export function formatBirthDate(value: { day: string; month: string; year: string }): string {
  if (!value.day || !value.month || !value.year) return "—";
  return `${value.day} ${MONTHS[Number(value.month) - 1]} ${value.year}`;
}

export const GENDER_OPTIONS = [
  { value: "femme", label: "Femme" },
  { value: "homme", label: "Homme" },
  { value: "non_precise", label: "Je préfère ne pas le préciser" },
];

export function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="review-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
