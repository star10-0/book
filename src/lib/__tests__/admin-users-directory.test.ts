import assert from "node:assert/strict";
import test from "node:test";
import { getAdminUserDetails, getAdminUsersList, parseUsersScope, resolveUsersWhere } from "@/lib/admin/users-directory";

test("parseUsersScope keeps supported values and defaults to all", () => {
  assert.equal(parseUsersScope("all"), "all");
  assert.equal(parseUsersScope("banned"), "banned");
  assert.equal(parseUsersScope("suspicious"), "suspicious");
  assert.equal(parseUsersScope("unknown"), "all");
});

test("resolveUsersWhere for suspicious scope uses placeholder when no suspicious users", async () => {
  const where = await resolveUsersWhere("suspicious", {
    findSuspiciousUserIds: async () => [],
  });

  assert.deepEqual(where, { id: "__none__" });
});

test("users page data logic supports active device placeholder", async () => {
  const rows = await getAdminUsersList("all", {
    findSuspiciousUserIds: async () => [],
    findUsers: async () => [
      {
        id: "u1",
        email: "u1@example.com",
        fullName: "User One",
        role: "USER",
        isActive: true,
        lastSeenAt: null,
        ordersCount: 3,
        accessGrantsCount: 5,
        trustedDevicesCount: 2,
        activeDevicesCount: null,
      },
    ],
    findUserDetails: async () => null,
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0].trustedDevicesCount, 2);
  assert.equal(rows[0].activeDevicesCount, null);
});

test("user details data logic returns summaries for operations screens", async () => {
  const details = await getAdminUserDetails("u1", {
    findUserDetails: async () => ({
      id: "u1",
      email: "u1@example.com",
      fullName: "User One",
      role: "USER",
      isActive: true,
      lastSeenAt: new Date("2026-04-01T12:00:00.000Z"),
      requirePasswordReset: false,
      sessionVersion: 8,
      bannedReason: null,
      ordersCount: 10,
      accessGrantsCount: 7,
      trustedDevicesCount: 2,
      suspiciousEventsCount: 1,
      paymentSummary: { pending: 1, succeeded: 6, failed: 2, total: 9 },
      trustedDevices: [],
      securityEvents: [],
      adminAuditLogs: [],
    }),
  });

  assert.ok(details);
  assert.equal(details?.ordersCount, 10);
  assert.equal(details?.paymentSummary.succeeded, 6);
  assert.equal(details?.accessGrantsCount, 7);
  assert.equal(details?.sessionVersion, 8);
});
