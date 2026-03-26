import { validateServerEnvOnce } from "@/lib/env";

export async function register() {
  validateServerEnvOnce();
}
