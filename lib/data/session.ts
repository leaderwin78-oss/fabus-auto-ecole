import type { SupabaseClient } from "@supabase/supabase-js";

// L'expiration de session ne doit pas frapper pendant un cours en
// visioconférence : la classe se déroule dans un autre onglet (Jitsi), donc
// l'onglet de l'application paraît inactif alors que l'utilisateur est bien
// en train de suivre son cours.
//
// Plutôt que de deviner depuis le navigateur, on lit le planning : si un
// rendez-vous de type `video_course` est en cours pour cet utilisateur, le
// minuteur est désactivé. Une marge de 15 minutes de part et d'autre couvre
// l'arrivée en avance et les cours qui débordent.
const MARGE_MS = 15 * 60 * 1000;

export async function coursVideoEnCours(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string
): Promise<boolean> {
  const maintenant = Date.now();
  const debut = new Date(maintenant - MARGE_MS).toISOString();
  const fin = new Date(maintenant + MARGE_MS).toISOString();

  const { data } = await supabase
    .from("appointments")
    .select("id, start_time, end_time")
    .eq("type", "video_course")
    .in("status", ["scheduled", "confirmed"])
    .or(`student_id.eq.${userId},instructor_id.eq.${userId}`)
    .lte("start_time", fin)
    .gte("end_time", debut)
    .limit(1);

  return (data?.length ?? 0) > 0;
}
