"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/courses";
import { erreurInterne } from "@/lib/actions/errors";
import { TYPES_MEDIA_POST, extensionMedia } from "@/lib/validation";

const MEDIAS_MAX = 4;
const TAILLE_MAX_MEDIA = 50 * 1024 * 1024; // 50 Mo, aligné sur la limite du bucket

export async function createPost(formData: FormData): Promise<ActionResult> {
  const { userId } = await requireProfile();
  const body = String(formData.get("body") ?? "").trim();
  const fichiers = formData.getAll("media").filter((f): f is File => f instanceof File && f.size > 0);

  // Une publication doit porter quelque chose : du texte, une image ou une vidéo.
  if (!body && fichiers.length === 0) {
    return { ok: false, error: "Écrivez quelque chose ou ajoutez une photo avant de publier." };
  }
  if (fichiers.length > MEDIAS_MAX) {
    return { ok: false, error: `Maximum ${MEDIAS_MAX} fichiers par publication.` };
  }

  // Types vérifiés côté serveur : le type déclaré par le navigateur se falsifie,
  // et le bucket applique la même liste — les deux doivent concorder.
  for (const f of fichiers) {
    if (!TYPES_MEDIA_POST.includes(f.type)) {
      return { ok: false, error: "Formats acceptés : JPEG, PNG, WebP, GIF, MP4, WebM, MOV." };
    }
    if (f.size > TAILLE_MAX_MEDIA) {
      return { ok: false, error: `« ${f.name} » dépasse 50 Mo.` };
    }
  }

  const supabase = await createClient();
  const { data: post, error } = await supabase
    .from("posts")
    .insert({ author_id: userId, body: body || null })
    .select("id")
    .single();
  if (error || !post) return { ok: false, error: erreurInterne(error, "community") };

  // Le préfixe du chemin est l'identifiant de l'auteur : c'est ce que la policy
  // du bucket vérifie pour interdire d'écrire dans le dossier d'autrui.
  const envoyes: string[] = [];
  for (const [index, fichier] of fichiers.entries()) {
    const ext = extensionMedia(fichier.type);
    const chemin = `${userId}/${post.id}/${Date.now()}-${index}.${ext}`;

    const { error: envoiErr } = await supabase.storage
      .from("post-media")
      .upload(chemin, fichier, { contentType: fichier.type });

    if (envoiErr) {
      // On ne laisse pas une publication à moitié illustrée : on annule tout.
      for (const c of envoyes) await supabase.storage.from("post-media").remove([c]);
      await supabase.from("posts").delete().eq("id", post.id);
      return { ok: false, error: `Envoi de « ${fichier.name} » impossible : ${envoiErr.message}` };
    }
    envoyes.push(chemin);

    await supabase.from("post_media").insert({
      post_id: post.id,
      author_id: userId,
      path: chemin,
      kind: fichier.type.startsWith("video/") ? "video" : "image",
      mime_type: fichier.type,
      size_bytes: fichier.size,
      position: index,
    });
  }

  revalidatePath("/communaute");
  return { ok: true };
}

export async function toggleLike(postId: string): Promise<ActionResult> {
  const { userId } = await requireProfile();
  const supabase = await createClient();

  const { data: existing } = await supabase.from("post_likes").select("*").eq("post_id", postId).eq("user_id", userId).maybeSingle();
  if (existing) {
    await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
  } else {
    await supabase.from("post_likes").insert({ post_id: postId, user_id: userId });
  }
  revalidatePath("/communaute");
  return { ok: true };
}

export async function addComment(formData: FormData): Promise<ActionResult> {
  const { userId } = await requireProfile();
  const postId = String(formData.get("post_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!postId || !body) return { ok: false, error: "Commentaire vide." };

  const supabase = await createClient();
  const { error } = await supabase.from("post_comments").insert({ post_id: postId, author_id: userId, body });
  if (error) return { ok: false, error: erreurInterne(error, "community") };

  revalidatePath("/communaute");
  return { ok: true };
}

export async function reportPost(postId: string, reason: string): Promise<ActionResult> {
  const { userId } = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("post_reports").insert({ post_id: postId, reporter_id: userId, reason });
  if (error) return { ok: false, error: erreurInterne(error, "community") };
  return { ok: true };
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) return { ok: false, error: erreurInterne(error, "community") };

  if (profile.role === "super_admin") {
    await logActivity({ organizationId: null, actorId: userId, action: "post.deleted_by_moderator", entityType: "post", entityId: postId });
  }
  revalidatePath("/communaute");
  return { ok: true };
}

export async function resolveReport(reportId: string): Promise<ActionResult> {
  const { profile } = await requireProfile();
  if (profile.role !== "super_admin") return { ok: false, error: "Réservé au super admin." };

  const supabase = await createClient();
  const { error } = await supabase.from("post_reports").update({ resolved: true }).eq("id", reportId);
  if (error) return { ok: false, error: erreurInterne(error, "community") };

  revalidatePath("/super-admin/community");
  return { ok: true };
}

export async function hidePost(postId: string): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "super_admin") return { ok: false, error: "Réservé au super admin." };

  const supabase = await createClient();
  const { error } = await supabase.from("posts").update({ status: "hidden" }).eq("id", postId);
  if (error) return { ok: false, error: erreurInterne(error, "community") };

  await logActivity({ organizationId: null, actorId: userId, action: "post.hidden_by_moderator", entityType: "post", entityId: postId });
  revalidatePath("/communaute");
  revalidatePath("/super-admin/community");
  return { ok: true };
}
