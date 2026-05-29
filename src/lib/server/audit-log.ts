import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

export type AuditLogAction =
  | "student.create"
  | "student.update"
  | "class.create"
  | "class.update"
  | "schedule.create"
  | "schedule.update"
  | "schedule.delete"
  | "schedule.bulk_create"
  | "external_class.create"
  | "external_class.delete"
  | "message_template.update"
  | "academy_settings.update";

export type AuditEntityType =
  | "student"
  | "class"
  | "student_schedule"
  | "external_class"
  | "message_template"
  | "academy_settings";

export async function writeAuditLog({
  admin,
  academyId,
  actorUserId,
  action,
  entityType,
  entityId,
  summary,
}: {
  admin: SupabaseAdminClient;
  academyId: string;
  actorUserId: string | null;
  action: AuditLogAction;
  entityType: AuditEntityType;
  entityId?: string | null;
  summary: string;
}) {
  const { error } = await admin.from("audit_logs").insert({
    academy_id: academyId,
    actor_user_id: actorUserId,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    summary: sanitizeAuditSummary(summary),
  });

  if (error) {
    console.error("Failed to write audit log", {
      action,
      entityType,
      entityId,
      message: error.message,
    });
  }
}

function sanitizeAuditSummary(value: string) {
  return value
    .replace(/\b\d{2,3}[-.\s]?\d{3,4}[-.\s]?\d{4}\b/g, "연락처")
    .trim()
    .slice(0, 180);
}
