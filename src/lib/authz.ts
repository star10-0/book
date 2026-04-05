import { UserRole, type AdminScope } from "@prisma/client";

function isTruthyFlag(value?: string) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

export function allowLegacyEmptyAdminScopesFallback() {
  return isTruthyFlag(process.env.ADMIN_SCOPES_LEGACY_ALLOW_EMPTY);
}

export function isAdminRole(role: UserRole) {
  return role === UserRole.ADMIN;
}

export function isCreatorOrAdminRole(role: UserRole) {
  return role === UserRole.CREATOR || isAdminRole(role);
}

export function isCurriculumManagerRole(role: UserRole) {
  return isAdminRole(role);
}

export function hasAdminScope(input: {
  adminScopes?: AdminScope[] | null;
  required: AdminScope;
  allowLegacyEmptyScopesFallback?: boolean;
}) {
  const scopes = input.adminScopes ?? [];
  if (scopes.length === 0) {
    return input.allowLegacyEmptyScopesFallback ?? allowLegacyEmptyAdminScopesFallback();
  }

  return scopes.includes("SUPER_ADMIN") || scopes.includes(input.required);
}

export function canManageCreatorBook(input: {
  role: UserRole;
  actorUserId: string;
  bookCreatorId: string | null | undefined;
}) {
  if (isAdminRole(input.role)) {
    return true;
  }

  if (!input.bookCreatorId) {
    return false;
  }

  return input.actorUserId === input.bookCreatorId;
}
