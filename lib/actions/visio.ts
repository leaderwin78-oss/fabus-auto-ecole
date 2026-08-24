"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { erreurInterne } from "@/lib/actions/errors";
import type { ActionResult } from "@/lib/actions/courses";

// Présence : enregistrée quand on entre réellement dans la salle, pas quand on
// clique sur le lien. C'est ce qui distingue un cours d'un lien partagé — le
// moniteur peut dire qui était là et combien de temps.
export async function marquerPresence(appointmentId: string): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  if (!profile.organization_id) return { ok: false, error: "Organisation introuvable." };

  const supabase = await createClient();

  // On ne fait confiance ni au client ni à l'URL : c'est la base qui dit si
  // cette personne est bien conviée à ce rendez-vous.
  const { data: rdv } = await supabase
    .from("appointments")
    .select("id, organization_id, student_id, instructor_id, type")
    .eq("id", appointmentId)
    .maybeSingle();

  if (!rdv || rdv.type !== "video_course") return { ok: false, error: "Cours introuvable." };

  const { error } = await supabase
    .from("course_attendance")
    .upsert(
      {
        appointment_id: appointmentId,
        user_id: userId,
        organization_id: rdv.organization_id,
        joined_at: new Date().toISOString(),
        left_at: null,
      },
      { onConflict: "appointment_id,user_id" }
    );

  if (error) return { ok: false, error: erreurInterne(error, "visio") };
  return { ok: true };
}

export async function marquerSortie(appointmentId: string): Promise<ActionResult> {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const { error } = await supabase
    .from("course_attendance")
    .update({ left_at: new Date().toISOString() })
    .eq("appointment_id", appointmentId)
    .eq("user_id", userId);

  if (error) return { ok: false, error: erreurInterne(error, "visio") };
  revalidatePath(`/cours/${appointmentId}`);
  return { ok: true };
}
