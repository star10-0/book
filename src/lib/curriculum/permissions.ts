import "server-only";

import { requireAdmin } from "@/lib/auth-session";

export async function requireCurriculumAdmin() {
  return requireAdmin({ callbackUrl: "/admin/curriculum" });
}
