import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createAdminAuditLog } from "@/lib/admin/audit-log";
import { prisma } from "@/lib/prisma";

test("createAdminAuditLog persists actor/action and optional targets", async () => {
  const prismaAny = prisma as unknown as { adminAuditLog?: { create?: unknown } };
  const originalAdminAuditLog = prismaAny.adminAuditLog;
  const calls: Array<Record<string, unknown>> = [];

  prismaAny.adminAuditLog = {
    create: async (args: Record<string, unknown>) => {
    calls.push(args);
    return { id: "audit_1", ...(args.data as Record<string, unknown>) };
    },
  };

  try {
    const result = await createAdminAuditLog({
      actorAdminId: "admin_1",
      action: "PAYMENT_RETRY_VERIFY",
      reason: " manual review ",
      targetUserId: "user_1",
      paymentAttemptId: "attempt_1",
      orderId: "order_1",
      metadata: { source: "test" },
    });

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], {
      data: {
        actorAdminId: "admin_1",
        action: "PAYMENT_RETRY_VERIFY",
        reason: "manual review",
        targetUserId: "user_1",
        paymentAttemptId: "attempt_1",
        orderId: "order_1",
        metadata: { source: "test" },
      },
    });
    assert.equal(result.id, "audit_1");
  } finally {
    prismaAny.adminAuditLog = originalAdminAuditLog;
  }
});

test("admin layout remains protected by requireAdmin", () => {
  const source = readFileSync("src/app/admin/layout.tsx", "utf8");
  assert.equal(source.includes('import { requireAdmin } from "@/lib/auth-session";'), true);
  assert.equal(source.includes("await requireAdmin({ callbackUrl: \"/admin\" });"), true);
});

test("session auth read contract remains compatible with user security fields", () => {
  const source = readFileSync("src/lib/auth-session.ts", "utf8");

  assert.equal(source.includes("acceptedTermsVersion: true"), true);
  assert.equal(source.includes("requirePasswordReset: true"), true);
  assert.equal(source.includes("passwordHash: true"), false);
});
