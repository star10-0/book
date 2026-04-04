import assert from "node:assert/strict";
import test from "node:test";
import { isRepeatedBlockedDeviceSuspicious } from "@/lib/security/suspicious-activity";

test("repeated blocked device attempts become suspicious at threshold", () => {
  assert.equal(isRepeatedBlockedDeviceSuspicious(2), false);
  assert.equal(isRepeatedBlockedDeviceSuspicious(3), true);
  assert.equal(isRepeatedBlockedDeviceSuspicious(6), true);
});
