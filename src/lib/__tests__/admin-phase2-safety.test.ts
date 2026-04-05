import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("payment attempt page explicitly enforces PAYMENT_ADMIN scope", () => {
  const source = readFileSync("src/app/admin/payments/[attemptId]/page.tsx", "utf8");
  assert.equal(source.includes('await requireAdminScope("PAYMENT_ADMIN", { callbackUrl: "/admin/payments" });'), true);
});

test("force grant validates consistency before any grant mutation", () => {
  const source = readFileSync("src/app/admin/payments/actions.ts", "utf8");
  const consistencyCheckIndex = source.indexOf("const consistentInput = isPaymentOrderStateConsistent");
  const grantMutationIndex = source.indexOf("await grantAccessForPaidOrder(tx");

  assert.notEqual(consistencyCheckIndex, -1);
  assert.notEqual(grantMutationIndex, -1);
  assert.equal(consistencyCheckIndex < grantMutationIndex, true);
});

test("force grant action requires break-glass scope and incident ticket input", () => {
  const source = readFileSync("src/app/admin/payments/actions.ts", "utf8");
  assert.equal(source.includes('requireAdminScope("BREAK_GLASS_PAYMENT_ADMIN"'), true);
  assert.equal(source.includes('const incidentTicketId = val(formData, "incidentTicketId");'), true);
  assert.equal(source.includes("validateBreakGlassForceGrantInput({ reason, incidentTicketId })"), true);
});

test("payments list disables misleading actions when prerequisites are missing", () => {
  const source = readFileSync("src/app/admin/payments/page.tsx", "utf8");
  assert.equal(source.includes("disabled={!canReconcileByTx"), true);
  assert.equal(source.includes("disabled={row.status !== \"VERIFYING\"}"), true);
});

test("admin books destructive action requires reason and explicit confirmation text", () => {
  const source = readFileSync("src/app/admin/books/actions.ts", "utf8");
  assert.equal(source.includes("deleteReason.length < 8"), true);
  assert.equal(source.includes('confirmationText !== expected'), true);
});

test("promo/books/curriculum operations write admin audit logs", () => {
  const promoSource = readFileSync("src/app/admin/promo-codes/actions.ts", "utf8");
  const bookSource = readFileSync("src/app/admin/books/actions.ts", "utf8");
  const curriculumSource = readFileSync("src/lib/curriculum/admin.ts", "utf8");

  assert.equal(promoSource.includes('action: "PROMO_CODE_MUTATION"'), true);
  assert.equal(bookSource.includes('action: "BOOK_MUTATION"'), true);
  assert.equal(curriculumSource.includes('action: "CURRICULUM_MUTATION"'), true);
});

test("payment admin server actions enforce PAYMENT_ADMIN scope", () => {
  const source = readFileSync("src/app/admin/payments/actions.ts", "utf8");

  const actionNames = [
    "retryVerifyPaymentAction",
    "reconcileByTxAction",
    "forceGrantPaymentAccessAction",
    "releasePaymentTxLockAction",
    "recoverStuckAttemptAction",
  ];

  for (const actionName of actionNames) {
    const start = source.indexOf(`export async function ${actionName}`);
    assert.notEqual(start, -1);
    const end = source.indexOf("export async function", start + 10);
    const body = source.slice(start, end === -1 ? undefined : end);

    const expectedScope = actionName === "forceGrantPaymentAccessAction" ? "BREAK_GLASS_PAYMENT_ADMIN" : "PAYMENT_ADMIN";
    assert.equal(body.includes(`requireAdminScope("${expectedScope}"`), true);
  }
});

test("force-grant and recovery write payment admin audit trail actions", () => {
  const source = readFileSync("src/app/admin/payments/actions.ts", "utf8");
  assert.equal(source.includes('"PAYMENT_FORCE_GRANT_ACCESS"'), true);
  assert.equal(source.includes('"PAYMENT_RETRY_VERIFY"'), true);
  assert.equal(source.includes('"PAYMENT_TX_LOCK_RELEASED"'), true);
  assert.equal(source.includes("incidentTicketId"), true);
  assert.equal(source.includes("beforeState"), true);
  assert.equal(source.includes("afterState"), true);
  assert.equal(source.includes("alreadyGranted"), true);
});

test("admin payment detail page warns about provider-settlement bypass and break-glass scope", () => {
  const source = readFileSync("src/app/admin/payments/[attemptId]/page.tsx", "utf8");
  assert.equal(source.includes("BREAK_GLASS_PAYMENT_ADMIN"), true);
  assert.equal(source.includes("يتجاوز التسوية المؤكدة من مزود الدفع"), true);
  assert.equal(source.includes("incidentTicketId"), true);
});
