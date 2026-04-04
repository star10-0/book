import { UserSecurityEventType } from "@prisma/client";

export const suspiciousSecurityEventTypes: UserSecurityEventType[] = [
  "LOGIN_BLOCKED_UNTRUSTED_DEVICE",
  "CONTENT_ACCESS_TOKEN_INVALID",
  "CONTENT_ACCESS_REPLAY_AFTER_REVOCATION",
  "CONTENT_ACCESS_MULTIPLE_DEVICE_ANOMALY",
  "SUSPICIOUS_ACCOUNT_ACTIVITY",
];

export function isSuspiciousSecurityEvent(type: UserSecurityEventType) {
  return suspiciousSecurityEventTypes.includes(type);
}
