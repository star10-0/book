import assert from "node:assert/strict";
import test from "node:test";
import { redactSensitiveData } from "@/lib/observability/redaction";

test("redactSensitiveData fully redacts credential-style fields", () => {
  const result = redactSensitiveData({
    authorization: "Bearer abc.def.ghi",
    apiKey: "super-secret-key",
    nested: {
      password: "plaintext-password",
      cookie: "session=123",
    },
  });

  assert.deepEqual(result, {
    authorization: "[REDACTED]",
    apiKey: "[REDACTED]",
    nested: {
      password: "[REDACTED]",
      cookie: "[REDACTED]",
    },
  });
});

test("redactSensitiveData masks provider and payment reference fields", () => {
  const result = redactSensitiveData({
    providerReference: "sham-manual:pay_123456",
    transactionReference: "TX-99887766",
    destinationAccount: "0999999",
  });

  assert.deepEqual(result, {
    providerReference: "sh***56",
    transactionReference: "TX***66",
    destinationAccount: "09***99",
  });
});

test("redactSensitiveData sanitizes bearer token strings in values", () => {
  const result = redactSensitiveData({
    message: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
  });

  assert.deepEqual(result, {
    message: "Bearer [REDACTED]",
  });
});

test("redactSensitiveData sanitizes sensitive query/header-like string segments", () => {
  const result = redactSensitiveData({
    endpoint: "https://pay.example/verify?tx=123&gsm=0999999&token=abc123xyz&api_key=super-secret",
    diagnostic: "x-api-key: top-secret-value",
  });

  assert.deepEqual(result, {
    endpoint: "https://pay.example/verify?tx=[REDACTED]&gsm=[REDACTED]&token=[REDACTED]&api_key=[REDACTED]",
    diagnostic: "x-api-key: [REDACTED]",
  });
});
