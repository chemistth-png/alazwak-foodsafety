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

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id || null,
      entity_title: entry.entity_title || null,
      details: entry.details || {},
    });
  } catch (e) {
    console.error("Audit log error:", e);
  }
}
