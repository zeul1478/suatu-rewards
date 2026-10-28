import "server-only";
import type { Json } from "@/types/database";
import { supabaseAdmin } from "@/server/supabase/admin";

type AuditEntry = {
  storeId?: string | null;
  actorType: "customer" | "staff" | "system";
  actorId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  /** No PII here: mask phones (maskPhone), never include passwords or tokens. */
  details?: Json;
};

export async function recordAudit(entry: AuditEntry): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("audit_log")
    .insert({
      store_id: entry.storeId ?? null,
      actor_type: entry.actorType,
      actor_id: entry.actorId ?? null,
      action: entry.action,
      target_type: entry.targetType ?? null,
      target_id: entry.targetId ?? null,
      details: entry.details ?? {},
    });
  if (error) throw new Error(`Audit write failed: ${error.message}`);
}
