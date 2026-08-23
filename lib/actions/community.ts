"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import { logActivity } from "@/lib/audit";
import type { ActionResult } from "@/lib/actions/courses";

export async function createPost(formData: FormData): Promise<ActionResult> {
  const { userId } = await requireProfile();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "Écrivez quelque chose avant de publier." };

  const supabase = await createClient();
  const { error } = await supabase.from("posts").insert({ author_id: userId, body });
  if (error) return { ok: false, error: error.message };

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
  if (error) return { ok: false, error: error.message };

  revalidatePath("/communaute");
  return { ok: true };
}

export async function reportPost(postId: string, reason: string): Promise<ActionResult> {
  const { userId } = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("post_reports").insert({ post_id: postId, reporter_id: userId, reason });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deletePost(postId: string): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) return { ok: false, error: error.message };

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
  if (error) return { ok: false, error: error.message };

  revalidatePath("/super-admin/community");
  return { ok: true };
}

export async function hidePost(postId: string): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  if (profile.role !== "super_admin") return { ok: false, error: "Réservé au super admin." };

  const supabase = await createClient();
  const { error } = await supabase.from("posts").update({ status: "hidden" }).eq("id", postId);
  if (error) return { ok: false, error: error.message };

  await logActivity({ organizationId: null, actorId: userId, action: "post.hidden_by_moderator", entityType: "post", entityId: postId });
  revalidatePath("/communaute");
  revalidatePath("/super-admin/community");
  return { ok: true };
}
