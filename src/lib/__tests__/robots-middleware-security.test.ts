import assert from "node:assert/strict";
import test from "node:test";
import robots from "@/app/robots";
import { config, middleware } from "@/middleware";

function withNodeEnv<T>(value: string | undefined, run: () => T): T {
  const previous = process.env.NODE_ENV;

  if (value === undefined) {
    Reflect.deleteProperty(process.env, "NODE_ENV");
  } else {
    Object.assign(process.env, { NODE_ENV: value });
  }

  try {
    return run();
  } finally {
    if (previous === undefined) {
      Reflect.deleteProperty(process.env, "NODE_ENV");
    } else {
      Object.assign(process.env, { NODE_ENV: previous });
    }
  }
}

test("robots disallows crawling outside production", () => {
  const manifest = withNodeEnv("development", () => robots());

  assert.deepEqual(manifest.rules, {
    userAgent: "*",
    allow: "",
    disallow: "/",
  });
  assert.equal("sitemap" in manifest, false);
  assert.equal("host" in manifest, false);
});

test("robots allows crawling and publishes host metadata in production", () => {
  const previousBaseUrl = process.env.APP_BASE_URL;
  process.env.APP_BASE_URL = "https://book.example";

  const manifest = withNodeEnv("production", () => robots());

  assert.deepEqual(manifest.rules, {
    userAgent: "*",
    allow: "/",
    disallow: "",
  });
  assert.equal(manifest.sitemap, "https://book.example/sitemap.xml");
  assert.equal(manifest.host, "https://book.example");

  if (previousBaseUrl === undefined) {
    delete process.env.APP_BASE_URL;
  } else {
    process.env.APP_BASE_URL = previousBaseUrl;
  }
});

test("middleware matcher does not exclude /uploads/books", () => {
  assert.deepEqual(config.matcher, ["/((?!_next/static|_next/image|favicon.ico).*)"]);
});

test("middleware applies consistent security headers and blocks indexing for API and uploads", () => {
  const fakeRequest = (pathname: string) =>
    ({
      nextUrl: { pathname },
      headers: new Headers(),
    }) as Parameters<typeof middleware>[0];

  const apiResponse = middleware(fakeRequest("/api/health"));
  assert.match(apiResponse.headers.get("Content-Security-Policy") ?? "", /default-src 'self'/i);
  assert.equal(apiResponse.headers.get("X-Content-Type-Options"), "nosniff");
  assert.equal(apiResponse.headers.get("X-Frame-Options"), "DENY");
  assert.equal(apiResponse.headers.get("Referrer-Policy"), "strict-origin-when-cross-origin");
  assert.equal(apiResponse.headers.get("X-Robots-Tag"), "noindex, nofollow, noarchive");

  const uploadsResponse = middleware(fakeRequest("/uploads/books/example.epub"));
  assert.equal(uploadsResponse.headers.get("X-Robots-Tag"), "noindex, nofollow, noarchive");

  const pageResponse = middleware(fakeRequest("/"));
  assert.equal(pageResponse.headers.has("X-Robots-Tag"), false);
});
