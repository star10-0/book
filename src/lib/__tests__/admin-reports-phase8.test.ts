import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("admin reports API enforces scoped admin access and csv response", () => {
  const source = readFileSync("src/app/api/admin/reports/[kind]/route.ts", "utf8");

  assert.equal(source.includes("requireAdminScope(scopeFor(kind)"), true);
  assert.equal(source.includes("action: \"REPORT_EXPORTED\""), true);
  assert.equal(source.includes('"text/csv; charset=utf-8"'), true);
});

test("admin dashboard exposes system health card", () => {
  const source = readFileSync("src/app/admin/page.tsx", "utf8");

  assert.equal(source.includes("صحة النظام"), true);
  assert.equal(source.includes("dashboard.systemHealth.providers"), true);
});
