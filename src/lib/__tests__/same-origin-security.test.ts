import assert from "node:assert/strict";
import test from "node:test";
import { isSameOriginMutation } from "@/lib/security";

function withEnv<T>(patch: Record<string, string | undefined>, run: () => T) {
  const original = { ...process.env };
  for (const [key, value] of Object.entries(patch)) {
    if (typeof value === "string") process.env[key] = value;
    else delete process.env[key];
  }

  try {
    return run();
  } finally {
    process.env = original;
  }
}

test("isSameOriginMutation trusts canonical APP_BASE_URL in production", () => {
  withEnv(
    {
      NODE_ENV: "production",
      APP_BASE_URL: "https://book.example",
      TRUSTED_ORIGINS: undefined,
    },
    () => {
      const request = new Request("https://internal.reverse-proxy.local/api/payments/create", {
        method: "POST",
        headers: {
          origin: "https://book.example",
          host: "internal.reverse-proxy.local",
          "x-forwarded-host": "attacker.example",
          "x-forwarded-proto": "http",
        },
      });

      assert.equal(isSameOriginMutation(request), true);
    },
  );
});

test("isSameOriginMutation rejects spoofed origin in production even with manipulated forwarded headers", () => {
  withEnv(
    {
      NODE_ENV: "production",
      APP_BASE_URL: "https://book.example",
      TRUSTED_ORIGINS: undefined,
    },
    () => {
      const request = new Request("https://internal.reverse-proxy.local/api/payments/create", {
        method: "POST",
        headers: {
          origin: "https://evil.example",
          host: "internal.reverse-proxy.local",
          "x-forwarded-host": "book.example",
          "x-forwarded-proto": "https",
        },
      });

      assert.equal(isSameOriginMutation(request), false);
    },
  );
});

test("isSameOriginMutation allows explicitly configured TRUSTED_ORIGINS", () => {
  withEnv(
    {
      NODE_ENV: "production",
      APP_BASE_URL: "https://book.example",
      TRUSTED_ORIGINS: "https://checkout.book.example",
    },
    () => {
      const request = new Request("https://book.example/api/orders", {
        method: "POST",
        headers: {
          origin: "https://checkout.book.example",
          host: "book.example",
        },
      });

      assert.equal(isSameOriginMutation(request), true);
    },
  );
});
