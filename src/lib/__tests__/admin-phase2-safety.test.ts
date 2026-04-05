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
