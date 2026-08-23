"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/courses";
import { erreurInterne } from "@/lib/actions/errors";

async function requireSuperAdmin() {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "super_admin") return { ok: false as const, error: "Action réservée au super admin." };
  return { ok: true as const, userId };
}

export async function createAnnouncement(formData: FormData): Promise<ActionResult> {
  const check = await requireSuperAdmin();
  if (!check.ok) return check;

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const category = String(formData.get("category") ?? "annonce");

  if (!title || !content) return { ok: false, error: "Titre et contenu requis." };

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    title,
    content,
    category,
    status: "draft",
    author_id: check.userId,
  });

  if (error) return { ok: false, error: erreurInterne(error, "announcements") };
  revalidatePath("/super-admin/announcements");
  return { ok: true };
}

export async function updateAnnouncementStatus(id: string, status: "draft" | "published" | "archived"): Promise<ActionResult> {
  const check = await requireSuperAdmin();
  if (!check.ok) return check;

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcements")
    .update({ status, published_at: status === "published" ? new Date().toISOString() : undefined })
    .eq("id", id);
  if (error) return { ok: false, error: erreurInterne(error, "announcements") };

  await logActivity({ organizationId: null, actorId: check.userId, action: `announcement.${status}`, entityType: "announcement", entityId: id });
  revalidatePath("/super-admin/announcements");
  revalidatePath("/annonces");
  return { ok: true };
}
