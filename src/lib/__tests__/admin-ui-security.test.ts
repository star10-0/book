import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const files = [
  "src/app/admin/users/page.tsx",
  "src/app/admin/users/[userId]/page.tsx",
  "src/app/admin/payments/page.tsx",
  "src/app/admin/payments/[attemptId]/page.tsx",
];

test("admin pages do not reference plaintext password fields", () => {
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    assert.equal(source.includes("passwordHash"), false, `${file} should not include passwordHash`);
    assert.equal(source.includes("plaintext"), false, `${file} should not include plaintext password views`);
  }
});
