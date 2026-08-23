"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";
import type { ActionResult } from "@/lib/actions/courses";
import { erreurInterne } from "@/lib/actions/errors";

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

  // The id is generated here rather than read back from the insert on purpose:
  // conversations_select only admits participants, and the creator does not
  // become one until the next statement. Asking PostgREST to RETURN the new
  // row would therefore fail the SELECT policy and abort the whole insert
  // ("new row violates row-level security policy"), which made starting a
  // conversation impossible. Supplying the uuid avoids the RETURNING entirely.
  const conversationId = crypto.randomUUID();
  const { error } = await supabase
    .from("conversations")
    .insert({ id: conversationId, organization_id: profile.organization_id });
  if (error) return { ok: false, error: erreurInterne(error, "messages") };

  const { error: participantsError } = await supabase.from("conversation_participants").insert([
    { conversation_id: conversationId, user_id: userId },
    { conversation_id: conversationId, user_id: otherUserId },
  ]);
  if (participantsError) return { ok: false, error: erreurInterne(participantsError, "messages") };

  return { ok: true, conversationId };
}

export async function sendMessage(conversationId: string, body: string): Promise<ActionResult> {
  const { userId } = await requireProfile();
  if (!body.trim()) return { ok: false, error: "Message vide." };

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: userId, body: body.trim() });
  if (error) return { ok: false, error: erreurInterne(error, "messages") };

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
