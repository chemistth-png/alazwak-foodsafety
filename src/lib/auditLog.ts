import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "delete_task"
  | "approve_task"
  | "revise_task"
  | "generate_task"
  | "delete_document"
  | "delete_conversation"
  | "delete_sop"
  | "clear_chat"
  | "upload_document"
  | "export_task";

interface AuditEntry {
  action: AuditAction;
  entity_type: string;
  entity_id?: string;
  entity_title?: string;
  details?: Record<string, any>;
}

export async function logAudit(entry: AuditEntry) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.rpc("log_audit_event", {
      p_action: entry.action,
      p_entity_type: entry.entity_type,
      p_entity_id: entry.entity_id || null,
      p_entity_title: entry.entity_title || null,
      p_details: (entry.details || {}) as any,
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}
