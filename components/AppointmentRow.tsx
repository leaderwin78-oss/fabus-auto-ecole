"use client";

import Link from "next/link";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateAppointmentStatus, addSessionNote } from "@/lib/actions/appointments";

interface AppointmentLike {
  id: string;
  title: string;
  type: string;
  status: string;
  start_time: string;
  end_time: string;
  meeting_url: string | null;
  location: string | null;
  student?: { full_name: string } | { full_name: string }[] | null;
  instructor?: { full_name: string } | { full_name: string }[] | null;
}

const TYPE_LABEL: Record<string, string> = {
  driving_session: "Séance de conduite",
  video_course: "Visioconférence",
  exam: "Examen",
  other: "Rendez-vous",
};

const STATUS_BADGE: Record<string, string> = {
  scheduled: "badge-info",
  confirmed: "",
  canceled: "badge-danger",
  completed: "badge-muted",
  no_show: "badge-warning",
};

function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? v[0] ?? null : v;
}

export function AppointmentRow({
  appointment,
  canEdit,
  canAddNote,
}: {
  appointment: AppointmentLike;
  canEdit?: boolean;
  canAddNote?: boolean;
}) {
  const router = useRouter();
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const student = one(appointment.student);
  const instructor = one(appointment.instructor);

  function setStatus(status: "confirmed" | "canceled" | "completed" | "no_show") {
    startTransition(async () => {
      await updateAppointmentStatus(appointment.id, status);
      router.refresh();
    });
  }

  function submitNote() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("appointment_id", appointment.id);
      fd.set("observations", note);
      const result = await addSessionNote(fd);
      if (result.ok) {
        setNote("");
        setNoteOpen(false);
        router.refresh();
      }
    });
  }

  return (
    <div className="card card-flat">
      <div className="flex justify-between items-center" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
        <div>
          <p className="mb-0" style={{ fontWeight: 600 }}>{appointment.title}</p>
          <span className="text-sm text-muted-color">
            {TYPE_LABEL[appointment.type] ?? appointment.type} • {new Date(appointment.start_time).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })}
            {student && ` • ${student.full_name}`}
            {instructor && ` • Moniteur : ${instructor.full_name}`}
          </span>
        </div>
        <span className={`badge ${STATUS_BADGE[appointment.status] ?? ""}`}>{appointment.status}</span>
      </div>

      {appointment.type === "video_course" && appointment.meeting_url && (
        <Link href={`/cours/${appointment.id}`} className="btn btn-primary btn-sm mt-2 btn-shine">
          <i className="fa-solid fa-video"></i> Rejoindre
        </Link>
      )}

      {canEdit && appointment.status !== "canceled" && appointment.status !== "completed" && (
        <div className="flex gap-2 mt-2" style={{ flexWrap: "wrap" }}>
          {appointment.status === "scheduled" && (
            <button className="btn btn-secondary btn-sm" disabled={isPending} onClick={() => setStatus("confirmed")}>Confirmer</button>
          )}
          <button className="btn btn-secondary btn-sm" disabled={isPending} onClick={() => setStatus("completed")}>Marquer terminée</button>
          <button className="btn btn-secondary btn-sm" disabled={isPending} onClick={() => setStatus("no_show")}>Absence élève</button>
          <button className="btn btn-danger btn-sm" disabled={isPending} onClick={() => setStatus("canceled")}>Annuler</button>
        </div>
      )}

      {canAddNote && appointment.type === "driving_session" && (
        <div className="mt-2">
          {!noteOpen ? (
            <button className="btn btn-outline btn-sm" onClick={() => setNoteOpen(true)}>Ajouter une observation</button>
          ) : (
            <div className="mt-2">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                style={{ width: "100%", padding: "0.6rem", borderRadius: "var(--radius-md)", border: "1px solid var(--border-color)", fontFamily: "inherit" }}
                placeholder="Observations sur la séance..."
              />
              <button className="btn btn-primary btn-sm mt-2" disabled={isPending || !note.trim()} onClick={submitNote}>Enregistrer</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
