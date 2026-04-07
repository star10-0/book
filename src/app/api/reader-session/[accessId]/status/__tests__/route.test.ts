import assert from "node:assert/strict";
import test from "node:test";
import { resolveReaderSessionStatusPayload } from "@/lib/reader-session-status";

test("reader-session status returns GRACE for correct sid", () => {
  const payload = resolveReaderSessionStatusPayload({
    sidProvided: true,
    access: {
      allowed: true,
      mode: "GRACE",
      graceEndsAt: new Date("2026-04-07T10:05:00.000Z"),
      remainingMs: 120_000,
    },
  });

  assert.equal(payload.status, 200);
  assert.equal(payload.body.mode, "GRACE");
});

test("reader-session status denies GRACE when sid is missing", () => {
  const payload = resolveReaderSessionStatusPayload({
    sidProvided: false,
    access: {
      allowed: true,
      mode: "GRACE",
      graceEndsAt: new Date("2026-04-07T10:05:00.000Z"),
      remainingMs: 120_000,
    },
  });

  assert.equal(payload.status, 403);
  assert.equal(payload.body.mode, "EXPIRED");
});

test("reader-session status returns expired after grace expiry or invalid sid resolution", () => {
  const payload = resolveReaderSessionStatusPayload({
    sidProvided: true,
    access: {
      allowed: false,
      reason: "EXPIRED",
    },
  });

  assert.equal(payload.status, 403);
  assert.equal(payload.body.mode, "EXPIRED");
});
