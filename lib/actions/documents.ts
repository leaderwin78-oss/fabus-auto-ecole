"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, isOrgStaffRole } from "@/lib/auth";
import { fichierValide, TYPES_DOCUMENT } from "@/lib/validation";
import type { ActionResult } from "@/lib/actions/courses";
import { erreurInterne } from "@/lib/actions/errors";

export async function uploadDocument(formData: FormData): Promise<ActionResult> {
  const { userId, profile } = await requireProfile();
  if (!profile.organization_id) return { ok: false, error: "Organisation introuvable." };

  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "autre");
  const file = formData.get("file") as File | null;

  if (!title) return { ok: false, error: "Le titre est requis." };

  // Le type MIME n'était pas vérifié et le nom fourni par le client était
  // repris tel quel dans le chemin de stockage.
  const verdict = fichierValide(file as File, TYPES_DOCUMENT, 10 * 1024 * 1024);
  if (!verdict.ok) return { ok: false, error: verdict.error };

  const supabase = await createClient();
  const path = `${profile.organization_id}/${userId}/${Date.now()}.${verdict.extension}`;

  const { error: uploadError } = await supabase.storage.from("documents").upload(path, file as File, {
    contentType: (file as File).type,
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

  if (insertError) return { ok: false, error: erreurInterne(insertError, "documents") };

  revalidatePath("/student/documents");
  revalidatePath("/admin/students");
  return { ok: true };
}

export async function updateDocumentStatus(
  documentId: string,
  status: "validated" | "rejected"
): Promise<ActionResult> {
  const { profile } = await requireProfile();
  if (!isOrgStaffRole(profile.role) && profile.role !== "super_admin") {
    return { ok: false, error: "Action réservée aux administrateurs." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("documents").update({ status }).eq("id", documentId);
  if (error) return { ok: false, error: erreurInterne(error, "documents") };

  revalidatePath("/admin/students");
  revalidatePath("/student/documents");
  return { ok: true };
}

export async function getSignedDocumentUrl(path: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.storage.from("documents").createSignedUrl(path, 60 * 5);
  return data?.signedUrl ?? null;
}
