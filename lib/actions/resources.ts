"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { ActionResult } from "@/lib/actions/courses";
import { erreurInterne } from "@/lib/actions/errors";

export async function createResourceLink(formData: FormData): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "super_admin") return { ok: false, error: "Réservé au super admin." };

  const title = String(formData.get("title") ?? "").trim();
  const url = String(formData.get("url") ?? "").trim();
  const category = String(formData.get("category") ?? "autre");
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!title || !url) return { ok: false, error: "Titre et lien requis." };
  try {
    new URL(url);
  } catch {
    return { ok: false, error: "Lien invalide." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("resource_links").insert({ title, url, category, description, created_by: userId });
  if (error) return { ok: false, error: erreurInterne(error, "resources") };

  revalidatePath("/super-admin/resources");
  revalidatePath("/instructor/resources");
  return { ok: true };
}

export async function deleteResourceLink(id: string): Promise<ActionResult> {
  const { profile } = await requireProfile();
  if (profile.role !== "super_admin") return { ok: false, error: "Réservé au super admin." };

  const supabase = await createClient();
  const { error } = await supabase.from("resource_links").delete().eq("id", id);
  if (error) return { ok: false, error: erreurInterne(error, "resources") };

  revalidatePath("/super-admin/resources");
  revalidatePath("/instructor/resources");
  return { ok: true };
}
