"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { ActionResult } from "@/lib/actions/courses";

export async function startConversation(otherUserId: string): Promise<{ ok: boolean; conversationId?: string; error?: string }> {
  const { userId, profile } = await requireProfile();
  if (!profile.organization_id) return { ok: false, error: "Organisation introuvable." };

  const supabase = await createClient();

  // Reuse an existing 1:1 conversation between these two users if one exists.
  const { data: mine } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", userId);
  const { data: theirs } = await supabase.from("conversation_participants").select("conversation_id").eq("user_id", otherUserId);
  const mineIds = new Set((mine ?? []).map((r) => r.conversation_id));
  const shared = (theirs ?? []).find((r) => mineIds.has(r.conversation_id));
  if (shared) return { ok: true, conversationId: shared.conversation_id };

  const { data: conversation, error } = await supabase
    .from("conversations")
    .insert({ organization_id: profile.organization_id })
    .select()
    .single();
  if (error || !conversation) return { ok: false, error: error?.message ?? "Erreur." };

  const { error: participantsError } = await supabase.from("conversation_participants").insert([
    { conversation_id: conversation.id, user_id: userId },
    { conversation_id: conversation.id, user_id: otherUserId },
  ]);
  if (participantsError) return { ok: false, error: participantsError.message };

  return { ok: true, conversationId: conversation.id };
}

export async function sendMessage(conversationId: string, body: string): Promise<ActionResult> {
  const { userId } = await requireProfile();
  if (!body.trim()) return { ok: false, error: "Message vide." };

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: userId, body: body.trim() });
  if (error) return { ok: false, error: error.message };

  await supabase
    .from("conversation_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("conversation_id", conversationId)
    .eq("user_id", userId);

  revalidatePath("/student/messages");
  revalidatePath("/instructor/messages");
  revalidatePath("/admin/messages");
  return { ok: true };
}
