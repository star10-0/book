import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { isSessionTokenValid } from "@/lib/admin/user-security";
import {
  banUserByAdmin,
  forceLogoutAllSessionsByAdmin,
  forcePasswordResetByAdmin,
  unbanUserByAdmin,
} from "@/lib/admin/user-management";

function createDeps(initial: { isActive?: boolean; sessionVersion?: number; requirePasswordReset?: boolean; bannedReason?: string | null } = {}) {
  const calls: {
    updates: unknown[];
    securityEvents: unknown[];
    audits: unknown[];
  } = {
    updates: [],
    securityEvents: [],
    audits: [],
  };

  const user = {
    id: "user_1",
    isActive: initial.isActive ?? true,
    sessionVersion: initial.sessionVersion ?? 2,
    requirePasswordReset: initial.requirePasswordReset ?? false,
    bannedReason: initial.bannedReason ?? null,
  };

  return {
    calls,
    deps: {
      findUserById: async (userId: string) => (userId === "user_1" ? user : null),
      updateUser: async (_userId: string, data: unknown) => {
        calls.updates.push(data);
      },
      createSecurityEvent: async (userId: string, type: string, metadata?: unknown) => {
        calls.securityEvents.push({ userId, type, metadata });
      },
      createAuditLog: async (input: unknown) => {
        calls.audits.push(input);
      },
    },
  };
}

test("admin users list page renders core fields and quick actions", () => {
  const source = readFileSync("src/app/admin/users/page.tsx", "utf8");

  assert.equal(source.includes('title: "البريد"'), true);
  assert.equal(source.includes('title: "الاسم"'), true);
  assert.equal(source.includes('title: "الدور"'), true);
  assert.equal(source.includes('title: "الحالة"'), true);
  assert.equal(source.includes('title: "طلبات"'), true);
  assert.equal(source.includes('title: "وصول"'), true);
  assert.equal(source.includes('title: "أجهزة موثوقة"'), true);
  assert.equal(source.includes('title: "أجهزة نشطة (غير متاح)"'), true);
  assert.equal(source.includes('title: "آخر نشاط"'), true);

  assert.equal(source.includes("banUserAction"), true);
  assert.equal(source.includes("unbanUserAction"), true);
  assert.equal(source.includes("adminForceLogoutAllDevicesAction"), true);
  assert.equal(source.includes("forcePasswordResetAction"), true);
});

test("ban user deactivates account, invalidates sessions, and audits", async () => {
  const { deps, calls } = createDeps({ isActive: true, sessionVersion: 7 });

  const result = await banUserByAdmin(
    { actorAdminId: "admin_1", targetUserId: "user_1", reason: "abuse" },
    deps,
  );

  assert.deepEqual(result, { ok: true });
  assert.equal(calls.updates.length, 1);
  assert.deepEqual(calls.updates[0], {
    isActive: false,
    bannedReason: "abuse",
    sessionVersion: { increment: 1 },
  });
  assert.deepEqual(calls.securityEvents[0], {
    userId: "user_1",
    type: "FORCE_LOGOUT_ALL",
    metadata: { source: "admin_ban" },
  });
  assert.equal(calls.audits.length, 1);
  assert.deepEqual(calls.audits[0], {
    actorAdminId: "admin_1",
    targetUserId: "user_1",
    action: "USER_BANNED",
    reason: "abuse",
    metadata: {
      previous: { isActive: true, sessionVersion: 7 },
      next: { isActive: false, sessionVersion: 8 },
    },
  });
  assert.equal(isSessionTokenValid(7, 8, false), false);
});

test("ban rejects self-action", async () => {
  const { deps } = createDeps();
  const result = await banUserByAdmin({ actorAdminId: "user_1", targetUserId: "user_1" }, deps);
  assert.deepEqual(result, { ok: false, code: "SELF_ACTION" });
});

test("unban user restores active state and writes audit log", async () => {
  const { deps, calls } = createDeps({ isActive: false, bannedReason: "abuse" });

  await unbanUserByAdmin({ actorAdminId: "admin_1", targetUserId: "user_1", reason: "appeal approved" }, deps);

  assert.deepEqual(calls.updates[0], {
    isActive: true,
    bannedReason: null,
  });
  assert.deepEqual(calls.audits[0], {
    actorAdminId: "admin_1",
    targetUserId: "user_1",
    action: "USER_UNBANNED",
    reason: "appeal approved",
    metadata: {
      previous: { isActive: false, bannedReason: "abuse" },
      next: { isActive: true, bannedReason: null },
    },
  });
});

test("force logout increments session version and creates audit trail", async () => {
  const { deps, calls } = createDeps({ sessionVersion: 12 });

  await forceLogoutAllSessionsByAdmin({ actorAdminId: "admin_1", targetUserId: "user_1", reason: "security review" }, deps);

  assert.deepEqual(calls.updates[0], { sessionVersion: { increment: 1 } });
  assert.deepEqual(calls.securityEvents[0], { userId: "user_1", type: "FORCE_LOGOUT_ALL", metadata: undefined });
  assert.deepEqual(calls.audits[0], {
    actorAdminId: "admin_1",
    targetUserId: "user_1",
    action: "USER_FORCE_LOGOUT_ALL",
    reason: "security review",
    metadata: {
      previous: { sessionVersion: 12 },
      next: { sessionVersion: 13 },
    },
  });
  assert.equal(isSessionTokenValid(12, 13, true), false);
});

test("force password reset sets flag, invalidates sessions, and audits", async () => {
  const { deps, calls } = createDeps({ requirePasswordReset: false, sessionVersion: 3 });

  await forcePasswordResetByAdmin({ actorAdminId: "admin_1", targetUserId: "user_1", reason: "credential risk" }, deps);

  assert.deepEqual(calls.updates[0], {
    requirePasswordReset: true,
    sessionVersion: { increment: 1 },
  });
  assert.deepEqual(calls.securityEvents[0], {
    userId: "user_1",
    type: "PASSWORD_RESET_REQUIRED",
    metadata: undefined,
  });
  assert.deepEqual(calls.audits[0], {
    actorAdminId: "admin_1",
    targetUserId: "user_1",
    action: "USER_FORCE_PASSWORD_RESET",
    reason: "credential risk",
    metadata: {
      previous: { requirePasswordReset: false, sessionVersion: 3 },
      next: { requirePasswordReset: true, sessionVersion: 4 },
    },
  });
});
