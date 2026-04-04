import type { AdminAuditLogInput } from "@/lib/admin/audit-log";
import { createAdminAuditLog } from "@/lib/admin/audit-log";

export type AdminAuditInput = AdminAuditLogInput;

export async function logAdminAudit(input: AdminAuditInput) {
  return createAdminAuditLog(input);
}
