import assert from "node:assert/strict";
import test from "node:test";
import { resolveSafeRelativeRedirect } from "@/lib/security/safe-redirect";

const requestUrl = "https://book.example/api/locale?lang=ar";

test("resolveSafeRelativeRedirect allows internal relative path", () => {
  const path = resolveSafeRelativeRedirect({ redirectParam: "/account/orders?tab=active", requestUrl });
  assert.equal(path, "/account/orders?tab=active");
});

test("resolveSafeRelativeRedirect blocks external absolute urls", () => {
  const path = resolveSafeRelativeRedirect({ redirectParam: "https://evil.example/phish", requestUrl });
  assert.equal(path, "/");
});

test("resolveSafeRelativeRedirect blocks protocol-relative redirects", () => {
  const path = resolveSafeRelativeRedirect({ redirectParam: "//evil.example/phish", requestUrl });
  assert.equal(path, "/");
});

test("resolveSafeRelativeRedirect allows same-origin absolute urls by normalizing to relative", () => {
  const path = resolveSafeRelativeRedirect({ redirectParam: "https://book.example/books/1", requestUrl });
  assert.equal(path, "/books/1");
});


test("resolveSafeRelativeRedirect blocks paths containing backslashes/control chars", () => {
  const withSlash = resolveSafeRelativeRedirect({ redirectParam: "/\\evil", requestUrl });
  const withControl = resolveSafeRelativeRedirect({ redirectParam: "/ok\u0000bad", requestUrl });

  assert.equal(withSlash, "/");
  assert.equal(withControl, "/");
});

test("resolveSafeRelativeRedirect preserves query and hash for same-origin absolute urls", () => {
  const path = resolveSafeRelativeRedirect({
    redirectParam: "https://book.example/account/orders?tab=paid#latest",
    requestUrl,
  });

  assert.equal(path, "/account/orders?tab=paid#latest");
});

test("resolveSafeRelativeRedirect rejects whitespace-only and newline-injected redirects", () => {
  const whitespace = resolveSafeRelativeRedirect({ redirectParam: "   ", requestUrl });
  const withNewline = resolveSafeRelativeRedirect({ redirectParam: "/account\n/orders", requestUrl });

  assert.equal(whitespace, "/");
  assert.equal(withNewline, "/");
});
