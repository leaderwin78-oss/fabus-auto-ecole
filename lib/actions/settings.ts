"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { ActionResult } from "@/lib/actions/courses";
import { erreurInterne } from "@/lib/actions/errors";

export async function updateOrganizationSettings(formData: FormData): Promise<ActionResult> {
  const { profile } = await requireProfile();
  if (profile.role !== "admin" && profile.role !== "super_admin") {
    return { ok: false, error: "Action réservée aux administrateurs." };
  }
  if (!profile.organization_id) return { ok: false, error: "Organisation introuvable." };

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || null;
  const phone = String(formData.get("phone") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim() || null;

  if (!name) return { ok: false, error: "Le nom est requis." };

  const supabase = await createClient();
  const { error } = await supabase.from("organizations").update({ name, city, phone, email }).eq("id", profile.organization_id);
  if (error) return { ok: false, error: erreurInterne(error, "settings") };

  revalidatePath("/admin/settings");
  return { ok: true };
}
