import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Append an audit record. Called only from server actions AFTER the actor's
 * role was verified. The actor id always comes from the verified session.
 */
export async function logAudit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  details: Record<string, unknown> = {},
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("audit_logs").insert({
      actor_id: actorId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    });
    if (error) console.error("[audit] insert failed", error.message);
  } catch (e) {
    console.error("[audit] unexpected failure", e);
  }
}
