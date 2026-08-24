import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProfile, isOrgStaffRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { lienSalle } from "@/lib/video/room";
import { VideoRoom } from "./VideoRoom";

// Salle de cours. L'autorisation est refaite ici : connaître l'identifiant du
// rendez-vous ne suffit pas à entrer — il faut y être convié.
export default async function SalleCoursPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = await params;
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();

  const { data: rdv } = await supabase
    .from("appointments")
    .select("*, instructor:instructor_id(full_name), student:student_id(full_name)")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!rdv || rdv.type !== "video_course") notFound();

  const estEncadrement = isOrgStaffRole(profile.role) || profile.role === "super_admin";
  const estConvie = rdv.student_id === userId || rdv.instructor_id === userId || estEncadrement;
  if (!estConvie) notFound();

  const estModerateur = rdv.instructor_id === userId || estEncadrement;

  const debut = new Date(rdv.start_time);
  const fin = new Date(rdv.end_time);
  const maintenant = new Date();
  // Quinze minutes d'avance : personne ne doit se retrouver devant une porte
  // fermée parce qu'il est arrivé un peu tôt.
  const ouvert = maintenant >= new Date(debut.getTime() - 15 * 60 * 1000) && maintenant <= new Date(fin.getTime() + 30 * 60 * 1000);

  const { data: presences } = await supabase
    .from("course_attendance")
    .select("user_id, joined_at, left_at, profiles:user_id(full_name)")
    .eq("appointment_id", appointmentId)
    .order("joined_at");

  return (
    <main className="section container" style={{ maxWidth: 1100 }}>
      <Link href={estModerateur ? "/instructor/calendar" : "/student/calendar"} className="text-sm text-muted-color mb-4" style={{ display: "inline-block" }}>
        <i className="fa-solid fa-arrow-left"></i> Retour au calendrier
      </Link>

      {ouvert ? (
        <VideoRoom
          appointmentId={appointmentId}
          titre={rdv.title}
          nomAffiche={profile.full_name}
          estModerateur={estModerateur}
          lienPartage={lienSalle(appointmentId)}
        />
      ) : (
        <div className="card text-center" style={{ maxWidth: 560, margin: "0 auto" }}>
          <div className="icon-box" style={{ margin: "0 auto 1.5rem" }}><i className="fa-solid fa-clock"></i></div>
          <h2 className="auth-title" style={{ fontSize: "1.5rem" }}>{rdv.title}</h2>
          <p className="auth-subtitle">
            {maintenant < debut
              ? `Ce cours commence le ${debut.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}. La salle ouvre 15 minutes avant.`
              : `Ce cours s'est terminé le ${fin.toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" })}.`}
          </p>
          <Link href={estModerateur ? "/instructor/calendar" : "/student/calendar"} className="btn btn-secondary">
            Voir mon calendrier
          </Link>
        </div>
      )}

      {/* Feuille de présence : visible par l'encadrement, comme un appel. */}
      {estModerateur && (presences?.length ?? 0) > 0 && (
        <section className="mt-8">
          <h3 className="mb-4">Présences ({presences?.length})</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>Participant</th><th>Entré à</th><th>Sorti à</th></tr></thead>
              <tbody>
                {(presences ?? []).map((p) => {
                  const prof = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                  return (
                    <tr key={p.user_id}>
                      <td>{(prof as { full_name?: string } | null)?.full_name ?? "Participant"}</td>
                      <td>{new Date(p.joined_at).toLocaleTimeString("fr-FR", { timeStyle: "short" })}</td>
                      <td>{p.left_at ? new Date(p.left_at).toLocaleTimeString("fr-FR", { timeStyle: "short" }) : "en ligne"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
