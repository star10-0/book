import assert from "node:assert/strict";
import test from "node:test";
import { UserRole, type AdminScope } from "@prisma/client";
import {
  canManageCreatorBook,
  hasAdminScope,
  isAdminRole,
  isCreatorOrAdminRole,
  isCurriculumManagerRole,
} from "@/lib/authz";

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

test("hasAdminScope denies empty scopes by default", () => {
  assert.equal(hasAdminScope({ adminScopes: [], required: "PAYMENT_ADMIN" as AdminScope }), false);
  assert.equal(hasAdminScope({ adminScopes: [], required: "BREAK_GLASS_PAYMENT_ADMIN" as AdminScope }), false);
  assert.equal(hasAdminScope({ adminScopes: undefined, required: "PAYMENT_ADMIN" as AdminScope }), false);
  assert.equal(hasAdminScope({ adminScopes: null, required: "PAYMENT_ADMIN" as AdminScope }), false);
});

test("hasAdminScope allows SUPER_ADMIN for any required admin scope", () => {
  assert.equal(hasAdminScope({ adminScopes: ["SUPER_ADMIN" as AdminScope], required: "CONTENT_ADMIN" as AdminScope }), true);
});

test("hasAdminScope allows explicit matching scope and denies non-matching scope", () => {
  assert.equal(hasAdminScope({ adminScopes: ["PAYMENT_ADMIN" as AdminScope], required: "PAYMENT_ADMIN" as AdminScope }), true);
  assert.equal(hasAdminScope({ adminScopes: ["BREAK_GLASS_PAYMENT_ADMIN" as AdminScope], required: "BREAK_GLASS_PAYMENT_ADMIN" as AdminScope }), true);
  assert.equal(hasAdminScope({ adminScopes: ["SUPPORT_ADMIN" as AdminScope], required: "PAYMENT_ADMIN" as AdminScope }), false);
});
