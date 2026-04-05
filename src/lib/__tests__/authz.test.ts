import assert from "node:assert/strict";
import test from "node:test";
import { UserRole, type AdminScope } from "@prisma/client";
import { canManageCreatorBook, hasAdminScope, isAdminRole, isCreatorOrAdminRole, isCurriculumManagerRole } from "@/lib/authz";

test("isAdminRole enforces admin-only boundaries", () => {
  assert.equal(isAdminRole(UserRole.ADMIN), true);
  assert.equal(isAdminRole(UserRole.CREATOR), false);
  assert.equal(isAdminRole(UserRole.USER), false);
});

test("isCreatorOrAdminRole enforces auth role boundaries", () => {
  assert.equal(isCreatorOrAdminRole(UserRole.ADMIN), true);
  assert.equal(isCreatorOrAdminRole(UserRole.CREATOR), true);
  assert.equal(isCreatorOrAdminRole(UserRole.USER), false);
});

test("isCurriculumManagerRole enforces curriculum admin boundaries", () => {
  assert.equal(isCurriculumManagerRole(UserRole.ADMIN), true);
  assert.equal(isCurriculumManagerRole(UserRole.CREATOR), false);
  assert.equal(isCurriculumManagerRole(UserRole.USER), false);
});

test("canManageCreatorBook enforces creator ownership boundaries", () => {
  assert.equal(
    canManageCreatorBook({
      role: UserRole.CREATOR,
      actorUserId: "creator-1",
      bookCreatorId: "creator-1",
    }),
    true,
  );

  assert.equal(
    canManageCreatorBook({
      role: UserRole.CREATOR,
      actorUserId: "creator-2",
      bookCreatorId: "creator-1",
    }),
    false,
  );

  assert.equal(
    canManageCreatorBook({
      role: UserRole.ADMIN,
      actorUserId: "admin-1",
      bookCreatorId: "creator-1",
    }),
    true,
  );
});

test("hasAdminScope supports legacy full admin and scoped admins", () => {
  assert.equal(hasAdminScope({ adminScopes: [], required: "PAYMENT_ADMIN" as AdminScope }), true);
  assert.equal(hasAdminScope({ adminScopes: ["SUPPORT_ADMIN" as AdminScope], required: "PAYMENT_ADMIN" as AdminScope }), false);
  assert.equal(hasAdminScope({ adminScopes: ["SUPER_ADMIN" as AdminScope], required: "CONTENT_ADMIN" as AdminScope }), true);
});
