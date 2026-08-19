"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createAppointment } from "@/lib/actions/appointments";

interface Person { id: string; full_name: string }

const TYPES = [
  { value: "driving_session", label: "Séance de conduite" },
  { value: "video_course", label: "Cours en visioconférence" },
  { value: "exam", label: "Examen blanc" },
  { value: "other", label: "Autre" },
];

export function CreateAppointmentForm({
  students,
  instructors,
  showInstructorField,
}: {
  students: Person[];
  instructors: Person[];
  showInstructorField: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="card">
      {error && <div className="form-error-banner">{error}</div>}
      {success && <div className="form-success-banner">Séance créée.</div>}
      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            setError(null);
            setSuccess(false);
            const result = await createAppointment(formData);
            if (!result.ok) setError(result.error ?? "Erreur");
            else {
              setSuccess(true);
              formRef.current?.reset();
              router.refresh();
            }
          })
        }
      >
        <div className="field">
          <label htmlFor="ap-type">Type</label>
          <select id="ap-type" name="type" defaultValue="driving_session">
            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="field">
          <label htmlFor="ap-title">Titre</label>
          <input id="ap-title" name="title" required placeholder="Ex: Créneaux et priorités" />
        </div>
        <div className="field">
          <label htmlFor="ap-student">Élève</label>
          <select id="ap-student" name="student_id" required>
            <option value="">Choisir un élève...</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        </div>
        {showInstructorField && (
          <div className="field">
            <label htmlFor="ap-instructor">Moniteur</label>
            <select id="ap-instructor" name="instructor_id" required>
              <option value="">Choisir un moniteur...</option>
              {instructors.map((i) => <option key={i.id} value={i.id}>{i.full_name}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <label htmlFor="ap-start">Début</label>
          <input id="ap-start" name="start_time" type="datetime-local" required />
        </div>
        <div className="field">
          <label htmlFor="ap-end">Fin</label>
          <input id="ap-end" name="end_time" type="datetime-local" required />
        </div>
        <div className="field">
          <label htmlFor="ap-location">Lieu (optionnel)</label>
          <input id="ap-location" name="location" placeholder="Ex: Agence Fann Point E" />
        </div>
        <button type="submit" className="btn btn-primary w-full" disabled={isPending}>
          {isPending ? "Création..." : "Créer la séance"}
        </button>
      </form>
    </div>
  );
}
