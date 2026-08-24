import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getNextAppointment, getEnrollmentsWithProgress } from "@/lib/data/student";
import { DashboardBanner } from "@/components/DashboardBanner";

const TYPE_LABEL: Record<string, string> = {
  driving_session: "Séance de conduite",
  video_course: "Cours en visioconférence",
  exam: "Examen",
  other: "Rendez-vous",
};

export default async function StudentDashboardPage() {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const [nextAppointment, enrollments, { data: documents }, { data: pendingPayment }] = await Promise.all([
    getNextAppointment(supabase, userId),
    getEnrollmentsWithProgress(supabase, userId),
    supabase.from("documents").select("*").eq("owner_id", userId).order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("*")
      .eq("student_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  const validatedDocs = (documents ?? []).filter((d) => d.status === "validated").length;
  const totalDocs = (documents ?? []).length;

  return (
    <>
      <DashboardBanner
        title="Votre parcours vers le permis"
        subtitle="Révisez le code, réservez vos heures de conduite et suivez l'avancement de votre dossier."
      />
      {nextAppointment ? (
        <div className="grid grid-cols-3 mb-8">
          <div className="card card-flat animate-fade-up" style={{ gridColumn: "span 2", background: "linear-gradient(135deg, var(--fabus-green), var(--fabus-green-dark))", color: "white", border: "none" }}>
            <span className="badge" style={{ background: "rgba(255,255,255,0.2)", color: "white", marginBottom: "1rem" }}>
              PROCHAINE ÉTAPE
            </span>
            <div className="flex justify-between items-center" style={{ flexWrap: "wrap", gap: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "0.5rem", color: "white" }}>
                  {TYPE_LABEL[nextAppointment.type] ?? "Rendez-vous"} : {nextAppointment.title}
                </h2>
                <p style={{ opacity: 0.9, marginBottom: "1rem", color: "white" }}>
                  {new Date(nextAppointment.start_time).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}
                </p>
                {nextAppointment.instructor_name && (
                  <div className="flex items-center gap-2" style={{ background: "rgba(0,0,0,0.1)", display: "inline-flex", padding: "0.5rem 1rem", borderRadius: "var(--radius-full)", fontSize: "0.875rem" }}>
                    <span>Moniteur : <strong>{nextAppointment.instructor_name}</strong></span>
                  </div>
                )}
              </div>
              {nextAppointment.type === "video_course" && nextAppointment.meeting_url ? (
                <Link href={`/cours/${nextAppointment.id}`} className="btn btn-pulse" style={{ background: "white", color: "var(--fabus-green-dark)" }}>
                  <i className="fa-solid fa-video"></i> Rejoindre la classe
                </Link>
              ) : (
                <Link href="/student/calendar" className="btn" style={{ background: "white", color: "var(--fabus-green-dark)" }}>
                  <i className="fa-solid fa-calendar"></i> Voir le calendrier
                </Link>
              )}
            </div>
          </div>

          <div className="card stat-tile flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 style={{ fontSize: "1.1rem", margin: 0 }}>Dossier Permis</h3>
                <span className="badge badge-warning">{totalDocs === 0 ? "À démarrer" : "En cours"}</span>
              </div>
              <p className="text-sm text-muted-color mb-0">
                {validatedDocs} / {totalDocs || "0"} documents validés
              </p>
            </div>
            <Link href="/student/documents" className="btn btn-outline w-full mt-4" style={{ fontSize: "0.875rem" }}>
              Voir mon dossier
            </Link>
          </div>
        </div>
      ) : (
        <div className="card mb-8 empty-state">
          <p className="mb-2" style={{ fontWeight: 600, color: "var(--text-primary)" }}>Aucun cours ou séance à venir.</p>
          <p className="mb-0">Votre moniteur ou votre auto-école programmera bientôt votre prochaine étape.</p>
        </div>
      )}

      <h3 className="mb-4 animate-fade-up delay-300">Votre progression</h3>
      {enrollments.length === 0 ? (
        <div className="card empty-state mb-8">
          <p className="mb-0">Vous n&apos;êtes inscrit à aucune formation pour l&apos;instant.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 mb-8">
          {enrollments.map((e) => (
            <div key={e.enrollmentId} className="card stat-tile">
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <div className="icon-box" style={{ marginBottom: 0, width: 40, height: 40, fontSize: "1rem" }}>
                    <i className="fa-solid fa-book-open"></i>
                  </div>
                  <h4 style={{ margin: 0, fontSize: "1.1rem" }}>{e.courseTitle}</h4>
                </div>
                <span style={{ fontWeight: 700, color: "var(--accent-text)" }}>{e.percent}%</span>
              </div>
              <div className="progress-container mb-4">
                <div className="progress-bar" style={{ width: `${e.percent}%` }}></div>
              </div>
              <p className="text-sm text-muted-color mb-0">{e.completedLessons} / {e.totalLessons} leçons terminées</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2">
        <div className="card flex items-center justify-between" style={{ borderLeft: pendingPayment ? "4px solid var(--warning)" : "4px solid var(--success)" }}>
          <div>
            <h4 className="mb-0" style={{ fontSize: "1rem" }}>{pendingPayment ? "Paiement en attente" : "Aucun paiement en attente"}</h4>
            {pendingPayment && (
              <p className="text-sm text-muted-color mb-0">
                {pendingPayment.amount_fcfa.toLocaleString("fr-FR")} F CFA
              </p>
            )}
          </div>
          <Link href="/student/payments" className="btn btn-secondary btn-sm">Voir mes paiements</Link>
        </div>

        <div className="card flex items-center justify-between">
          <div>
            <h4 className="mb-0" style={{ fontSize: "1rem" }}>Une question ?</h4>
            <p className="text-sm text-muted-color mb-0">Contactez votre moniteur ou votre auto-école.</p>
          </div>
          <Link href="/student/messages" className="btn btn-outline btn-sm">Envoyer un message</Link>
        </div>
      </div>
    </>
  );
}
