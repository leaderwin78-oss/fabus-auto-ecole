"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { ActionResult } from "@/lib/actions/courses";

export async function uploadDocument(formData: FormData): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  if (!profile.organization_id) return { ok: false, error: "Organisation introuvable." };

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "autre");
  const file = formData.get("file") as File | null;

  if (!title) return { ok: false, error: "Le titre est requis." };
  if (!file || file.size === 0) return { ok: false, error: "Choisissez un fichier." };
  if (file.size > 10 * 1024 * 1024) return { ok: false, error: "Fichier trop volumineux (max 10 Mo)." };

  const supabase = await createClient();
  const path = `${profile.organization_id}/${userId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from("documents").upload(path, file, {
    contentType: file.type || undefined,
  });
  if (uploadError) return { ok: false, error: `Échec de l'envoi du fichier : ${uploadError.message}` };

  const { error: insertError } = await supabase.from("documents").insert({
    organization_id: profile.organization_id,
    owner_id: userId,
    title,
    category,
    file_url: path,
    status: "submitted",
    uploaded_at: new Date().toISOString(),
  });

  if (insertError) return { ok: false, error: insertError.message };

  revalidatePath("/student/documents");
  revalidatePath("/admin/students");
  return { ok: true };
}

export async function updateDocumentStatus(
  documentId: string,
  status: "validated" | "rejected"
): Promise<ActionResult> {
  const { profile } = await requireProfile();
  if (profile.role !== "admin" && profile.role !== "super_admin") {
    return { ok: false, error: "Action réservée aux administrateurs." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("documents").update({ status }).eq("id", documentId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/students");
  revalidatePath("/student/documents");
  return { ok: true };
}

export async function getSignedDocumentUrl(path: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 5);
  return data?.signedUrl ?? null;
}
