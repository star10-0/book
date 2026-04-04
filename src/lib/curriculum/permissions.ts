import "server-only";

import { requireAdminScope } from "@/lib/auth-session";

export async function requireCurriculumAdmin() {
  return requireAdminScope("CONTENT_ADMIN", { callbackUrl: "/admin/curriculum" });
}
