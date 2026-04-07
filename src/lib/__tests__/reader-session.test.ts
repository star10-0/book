import assert from "node:assert/strict";
import test from "node:test";
import { AccessGrantStatus, AccessGrantType } from "@prisma/client";
import { resolveReaderSessionAccess } from "@/lib/reader-session";

type Grant = {
  id: string;
  userId: string;
  type: AccessGrantType;
  status: AccessGrantStatus;
  startsAt: Date;
  expiresAt: Date | null;
};

type Session = {
  id: string;
  accessGrantId: string;
  userId: string;
  openedAt: Date;
  graceEndsAt: Date | null;
  closedAt: Date | null;
};

function createTx(input: { grant: Grant | null; session: Session | null }) {
  const updates: Array<{ id: string; data: Record<string, unknown> }> = [];

  return {
    updates,
    tx: {
      accessGrant: {
        findFirst: async () => input.grant,
      },
      readingSession: {
        findFirst: async () => input.session,
        update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          updates.push({ id: where.id, data });
          if (input.session && input.session.id === where.id) {
            if ("graceEndsAt" in data) {
              input.session.graceEndsAt = data.graceEndsAt as Date;
            }
            if ("closedAt" in data) {
              input.session.closedAt = data.closedAt as Date;
            }
          }
          return input.session;
        },
      },
    },
  };
}

test("rental with open pre-expiry session gets grace", async () => {
  const now = new Date("2026-04-07T10:00:00.000Z");
  const grant: Grant = {
    id: "g1",
    userId: "u1",
    type: AccessGrantType.RENTAL,
    status: AccessGrantStatus.ACTIVE,
    startsAt: new Date("2026-04-01T10:00:00.000Z"),
    expiresAt: new Date("2026-04-07T09:59:00.000Z"),
  };
  const session: Session = {
    id: "s1",
    accessGrantId: "g1",
    userId: "u1",
    openedAt: new Date("2026-04-07T09:00:00.000Z"),
    graceEndsAt: null,
    closedAt: null,
  };
  const { tx, updates } = createTx({ grant, session });

  const result = await resolveReaderSessionAccess(tx as never, { accessGrantId: "g1", userId: "u1", now });

  assert.equal(result.allowed, true);
  assert.equal(result.mode, "GRACE");
  assert.equal(updates.length, 1);
});

test("expired rental without open session is denied", async () => {
  const now = new Date("2026-04-07T10:00:00.000Z");
  const grant: Grant = {
    id: "g1",
    userId: "u1",
    type: AccessGrantType.RENTAL,
    status: AccessGrantStatus.ACTIVE,
    startsAt: new Date("2026-04-01T10:00:00.000Z"),
    expiresAt: new Date("2026-04-07T09:59:00.000Z"),
  };
  const { tx } = createTx({ grant, session: null });
  const result = await resolveReaderSessionAccess(tx as never, { accessGrantId: "g1", userId: "u1", now });
  assert.deepEqual(result, { allowed: false, reason: "EXPIRED" });
});

test("session opened after expiry cannot claim grace", async () => {
  const now = new Date("2026-04-07T10:00:00.000Z");
  const grant: Grant = {
    id: "g1",
    userId: "u1",
    type: AccessGrantType.RENTAL,
    status: AccessGrantStatus.ACTIVE,
    startsAt: new Date("2026-04-01T10:00:00.000Z"),
    expiresAt: new Date("2026-04-07T09:59:00.000Z"),
  };
  const { tx } = createTx({ grant, session: null });
  const result = await resolveReaderSessionAccess(tx as never, { accessGrantId: "g1", userId: "u1", now });
  assert.equal(result.allowed, false);
});

test("purchase grants stay active and unaffected", async () => {
  const now = new Date("2026-04-07T10:00:00.000Z");
  const grant: Grant = {
    id: "g1",
    userId: "u1",
    type: AccessGrantType.PURCHASE,
    status: AccessGrantStatus.ACTIVE,
    startsAt: new Date("2026-04-01T10:00:00.000Z"),
    expiresAt: null,
  };
  const { tx } = createTx({ grant, session: null });
  const result = await resolveReaderSessionAccess(tx as never, { accessGrantId: "g1", userId: "u1", now });
  assert.deepEqual(result, { allowed: true, mode: "ACTIVE" });
});

test("grace expires exactly after 5 minutes", async () => {
  const now = new Date("2026-04-07T10:06:00.000Z");
  const grant: Grant = {
    id: "g1",
    userId: "u1",
    type: AccessGrantType.RENTAL,
    status: AccessGrantStatus.ACTIVE,
    startsAt: new Date("2026-04-01T10:00:00.000Z"),
    expiresAt: new Date("2026-04-07T10:00:00.000Z"),
  };
  const session: Session = {
    id: "s1",
    accessGrantId: "g1",
    userId: "u1",
    openedAt: new Date("2026-04-07T09:00:00.000Z"),
    graceEndsAt: new Date("2026-04-07T10:05:00.000Z"),
    closedAt: null,
  };
  const { tx, updates } = createTx({ grant, session });
  const result = await resolveReaderSessionAccess(tx as never, { accessGrantId: "g1", userId: "u1", now });
  assert.equal(result.allowed, false);
  assert.equal(updates.length, 1);
});
