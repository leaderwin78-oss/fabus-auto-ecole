"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import { fichierValide, TYPES_IMAGE, UrlExterne } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/courses";
import { erreurInterne } from "@/lib/actions/errors";

export async function updateOwnProfile(formData: FormData): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  if (!fullName) return { ok: false, error: "Le nom est requis." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", userId);
  if (error) return { ok: false, error: erreurInterne(error, "account") };

  await logActivity({ organizationId: profile.organization_id, actorId: userId, action: "profile.updated", entityType: "profile", entityId: userId });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateOwnAvatar(formData: FormData): Promise<ActionResult> {
  const { userId } = await requireProfile();
  const file = formData.get("file") as File | null;

  // Bucket public : un SVG ou du HTML téléversé ici serait servi avec un
  // Content-Type choisi par l'attaquant, donc exploitable en XSS sur le
  // domaine de stockage. On n'accepte que des images matricielles.
  const verdict = fichierValide(file as File, TYPES_IMAGE, 3 * 1024 * 1024);
  if (!verdict.ok) return { ok: false, error: verdict.error };

  const supabase = await createClient();
  const path = `${userId}/${Date.now()}.${verdict.extension}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file as File, {
    contentType: (file as File).type,
    upsert: true,
  });
  if (uploadError) return { ok: false, error: erreurInterne(uploadError, "account") };

  const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
  const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl.publicUrl }).eq("id", userId);
  if (error) return { ok: false, error: erreurInterne(error, "account") };

  revalidatePath("/", "layout");
  return { ok: true };
}

const SOCIAL_PLATFORMS = ["facebook", "instagram", "twitter", "tiktok", "youtube", "linkedin"] as const;

export async function updateSocialLinks(formData: FormData): Promise<ActionResult> {
  const { userId } = await requireProfile();

  const links: Record<string, string> = {};
  for (const platform of SOCIAL_PLATFORMS) {
    const value = String(formData.get(platform) ?? "").trim();
    if (!value) continue;
    // Ces liens sont rendus en <a href> sur le profil public : n'accepter que
    // http(s), sinon un `javascript:` deviendrait du XSS stocké.
    if (!UrlExterne.safeParse(value).success) {
      return { ok: false, error: `Le lien ${platform} doit commencer par http:// ou https://.` };
    }
    links[platform] = value;
  }
  const isPublic = formData.get("social_links_public") === "on";

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ social_links: links, social_links_public: isPublic }).eq("id", userId);
  if (error) return { ok: false, error: erreurInterne(error, "account") };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function changeOwnPassword(formData: FormData): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();

  const newPassword = String(formData.get("new_password") ?? "");
  const confirmPassword = String(formData.get("confirm_password") ?? "");

  if (newPassword.length < 8) return { ok: false, error: "Le mot de passe doit contenir au moins 8 caractères." };
  if (newPassword !== confirmPassword) return { ok: false, error: "Les mots de passe ne correspondent pas." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { ok: false, error: erreurInterne(error, "account") };

  await supabase.from("profiles").update({ must_change_password: false }).eq("id", userId);
  await logActivity({ organizationId: profile.organization_id, actorId: userId, action: "account.password_changed", entityType: "profile", entityId: userId });

  return { ok: true };
}
