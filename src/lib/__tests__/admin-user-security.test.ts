import assert from "node:assert/strict";
import test from "node:test";
import { buildBanUpdate, buildUnbanUpdate, isSessionTokenValid } from "@/lib/admin/user-security";

test("ban user marks inactive and increments session version", () => {
  const update = buildBanUpdate(3);
  assert.equal(update.isActive, false);
  assert.equal(update.sessionVersion, 4);
  assert.equal(isSessionTokenValid(3, update.sessionVersion, update.isActive), false);
});

test("unban user restores active state", () => {
  const update = buildUnbanUpdate();
  assert.equal(update.isActive, true);
});
