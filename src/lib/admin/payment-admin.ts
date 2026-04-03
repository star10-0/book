export function shouldForceGrantAccess(existingActiveGrantCount: number) {
  return existingActiveGrantCount === 0;
}

export function canReleaseTxLock(status: "PENDING" | "SUBMITTED" | "VERIFYING" | "PAID" | "FAILED") {
  return status === "VERIFYING";
}
