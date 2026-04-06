import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("secret scan workflow runs gitleaks fail-closed with pinned container tag", () => {
  const workflow = readFileSync(".github/workflows/secret-scan.yml", "utf8");

  assert.equal(workflow.includes("actions/checkout@8ade135a41bc03ea155e62e844d188df1ea18608"), true);
  assert.equal(workflow.includes("ghcr.io/gitleaks/gitleaks:v8.24.2"), true);
  assert.equal(workflow.includes("--exit-code 1"), true);
  assert.equal(workflow.includes("zricethezav/gitleaks:latest"), false);
});

test("local secret scan script avoids floating latest gitleaks tag", () => {
  const script = readFileSync("scripts/scan-secrets.sh", "utf8");

  assert.equal(script.includes("ghcr.io/gitleaks/gitleaks:v8.24.2"), true);
  assert.equal(script.includes(":latest"), false);
});
