import { createClient } from "@/lib/supabase/server";

// Fire-and-forget audit trail for sensitive actions (section 23). Failures
// here must never block the action itself — logging is best-effort.
export async function logActivity(params: {
  organizationId: string | null;
  actorId: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const supabase = await createClient();
    await supabase.from("activity_logs").insert({
      organization_id: params.organizationId,
      actor_id: params.actorId,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      metadata: params.metadata ?? {},
    });
  } catch {
    // best-effort — never throw from audit logging
  }
}
