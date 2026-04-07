import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const swPath = path.resolve(process.cwd(), "public", "sw.js");
const source = readFileSync(swPath, "utf8");

test("service worker defines explicit sensitive path prefixes", () => {
  const requiredPrefixes = [
    '"/account"',
    '"/orders"',
    '"/studio"',
    '"/admin"',
    '"/checkout"',
    '"/reader"',
    '"/api"',
  ];

  for (const prefix of requiredPrefixes) {
    assert.equal(source.includes(prefix), true, `missing sensitive prefix ${prefix}`);
  }
});

test("service worker bypasses caching for sensitive routes", () => {
  assert.equal(source.includes("isSensitivePath(path)"), true);
  assert.equal(source.includes("if (isSensitivePath(path))"), true);
});
