import type { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

type NextValRow = { nextval: bigint | number };

function extractSequenceValue(value: bigint | number) {
  return typeof value === "bigint" ? Number(value) : value;
}

async function nextSequenceValue(db: DbClient, sequenceName: string) {
  if (sequenceName !== "public_order_number_seq" && sequenceName !== "public_payment_reference_seq") {
    throw new Error(`Unsupported sequence: ${sequenceName}`);
  }

  const rows = await db.$queryRawUnsafe<NextValRow[]>(`SELECT nextval('${sequenceName}')`);
  const value = rows[0]?.nextval;

  if (typeof value !== "number" && typeof value !== "bigint") {
    throw new Error(`Failed to allocate sequence value for ${sequenceName}`);
  }

  return extractSequenceValue(value);
}

function formatPublicReference(prefix: "ORD" | "PAY", sequenceValue: number, date: Date) {
  const year = date.getUTCFullYear();
  const serial = sequenceValue.toString().padStart(6, "0");
  return `${prefix}-${year}-${serial}`;
}

export async function generatePublicOrderNumber(db: DbClient, now = new Date()) {
  const nextValue = await nextSequenceValue(db, "public_order_number_seq");
  return formatPublicReference("ORD", nextValue, now);
}

export async function generatePublicPaymentReference(db: DbClient, now = new Date()) {
  const nextValue = await nextSequenceValue(db, "public_payment_reference_seq");
  return formatPublicReference("PAY", nextValue, now);
}
