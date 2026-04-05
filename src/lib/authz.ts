import { UserRole, type AdminScope } from "@prisma/client";

export function isAdminRole(role: UserRole) {
  return role === UserRole.ADMIN;
}

export function isCreatorOrAdminRole(role: UserRole) {
  return role === UserRole.CREATOR || isAdminRole(role);
}

export function isCurriculumManagerRole(role: UserRole) {
  return isAdminRole(role);
}

export function hasAdminScope(input: { adminScopes?: AdminScope[] | null; required: AdminScope }) {
  const scopes = input.adminScopes ?? [];
  if (scopes.length === 0) {
    return true;
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
