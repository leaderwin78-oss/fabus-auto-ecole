"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/courses";

export async function updateOwnProfile(formData: FormData): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();

  const fullName = String(formData.get("full_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim() || null;
  if (!fullName) return { ok: false, error: "Le nom est requis." };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ full_name: fullName, phone }).eq("id", userId);
  if (error) return { ok: false, error: error.message };

  await logActivity({ organizationId: profile.organization_id, actorId: userId, action: "profile.updated", entityType: "profile", entityId: userId });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateOwnAvatar(formData: FormData): Promise<ActionResult> {
  const { userId } = await requireProfile();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "Choisissez une image." };
  if (file.size > 3 * 1024 * 1024) return { ok: false, error: "Image trop volumineuse (max 3 Mo)." };

  const supabase = await createClient();
  const path = `${userId}/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
    contentType: file.type || undefined,
    upsert: true,
  });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
  const { error } = await supabase.from("profiles").update({ avatar_url: publicUrl.publicUrl }).eq("id", userId);
  if (error) return { ok: false, error: error.message };

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
  if (error) return { ok: false, error: error.message };

  await supabase.from("profiles").update({ must_change_password: false }).eq("id", userId);
  await logActivity({ organizationId: profile.organization_id, actorId: userId, action: "account.password_changed", entityType: "profile", entityId: userId });

  return { ok: true };
}
