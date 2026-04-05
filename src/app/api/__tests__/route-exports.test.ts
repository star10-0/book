import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const ROUTE_ROOT = path.join(process.cwd(), "src", "app", "api");
const ALLOWED_ROUTE_EXPORTS = new Set([
  "GET",
  "POST",
  "PUT",
  "PATCH",
  "DELETE",
  "HEAD",
  "OPTIONS",
  "runtime",
  "revalidate",
  "dynamic",
  "dynamicParams",
  "fetchCache",
  "preferredRegion",
  "maxDuration",
]);

async function collectRouteFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        return collectRouteFiles(fullPath);
      }

      return entry.isFile() && entry.name === "route.ts" ? [fullPath] : [];
    }),
  );

  return files.flat();
}

function extractNamedExports(source: string) {
  const exported = new Set<string>();

  for (const match of source.matchAll(/export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/g)) {
    exported.add(match[1]);
  }

  for (const match of source.matchAll(/export\s+const\s+([A-Za-z_$][\w$]*)/g)) {
    exported.add(match[1]);
  }

  for (const match of source.matchAll(/export\s*\{([^}]+)\}/g)) {
    const names = match[1]
      .split(",")
      .map((segment) => segment.trim())
      .filter(Boolean)
      .map((segment) => segment.split(/\s+as\s+/i)[1] ?? segment.split(/\s+as\s+/i)[0]);

    for (const name of names) {
      exported.add(name.trim());
    }
  }

  return [...exported];
}

test("all app/api route.ts files export only Next.js route-compatible names", async () => {
  const routeFiles = await collectRouteFiles(ROUTE_ROOT);

  assert.ok(routeFiles.length > 0, "Expected at least one App Router route file under src/app/api");

  for (const routeFile of routeFiles) {
    const source = await readFile(routeFile, "utf8");
    const exports = extractNamedExports(source);
    const invalid = exports.filter((name) => !ALLOWED_ROUTE_EXPORTS.has(name));

    assert.deepEqual(
      invalid,
      [],
      `Invalid route export(s) in ${path.relative(process.cwd(), routeFile)}: ${invalid.join(", ")}`,
    );
  }
});
