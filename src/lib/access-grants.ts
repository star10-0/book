import { AccessGrantType, AccessGrantStatus, OfferType, Prisma } from "@prisma/client";
import { hasValidRentalDays } from "@/lib/services/invariants";

const DAY_IN_MS = 24 * 60 * 60 * 1000;

function addDays(baseDate: Date, days: number) {
  return new Date(baseDate.getTime() + days * DAY_IN_MS);
}

function mapOfferTypeToGrantType(type: OfferType): AccessGrantType {
  return type === OfferType.PURCHASE ? AccessGrantType.PURCHASE : AccessGrantType.RENTAL;
}

export async function grantAccessForPaidOrder(
  tx: Prisma.TransactionClient,
  input: {
    orderId: string;
    userId: string;
    grantedAt?: Date;
  },
) {
  const grantedAt = input.grantedAt ?? new Date();

  const orderItems = await tx.orderItem.findMany({
    where: { orderId: input.orderId },
    select: {
      id: true,
      bookId: true,
      offerType: true,
      rentalDays: true,
    },
  });

  const bookIds = Array.from(new Set(orderItems.map((item) => item.bookId)));
  const existingGrants =
    bookIds.length > 0
      ? await tx.accessGrant.findMany({
          where: {
            userId: input.userId,
            bookId: { in: bookIds },
            status: AccessGrantStatus.ACTIVE,
            OR: [
              { type: AccessGrantType.PURCHASE },
              {
                type: AccessGrantType.RENTAL,
                OR: [{ expiresAt: null }, { expiresAt: { gt: grantedAt } }],
              },
            ],
          },
          select: {
            id: true,
            bookId: true,
            type: true,
            startsAt: true,
            expiresAt: true,
          },
          orderBy: [{ startsAt: "asc" }, { id: "asc" }],
        })
      : [];

  const activePurchaseBooks = new Set(
    existingGrants.filter((grant) => grant.type === AccessGrantType.PURCHASE).map((grant) => grant.bookId),
  );

  const activeRentalByBook = new Map<
    string,
    {
      id?: string;
      expiresAt: Date | null;
      createdFromOrderItemId?: string;
    }
  >();

  for (const grant of existingGrants) {
    if (grant.type !== AccessGrantType.RENTAL) {
      continue;
    }

    if (!activeRentalByBook.has(grant.bookId)) {
      activeRentalByBook.set(grant.bookId, {
        id: grant.id,
        expiresAt: grant.expiresAt,
      });
    }
  }

  const purchaseCreates: Array<{
    userId: string;
    bookId: string;
    orderItemId: string;
    type: AccessGrantType;
    startsAt: Date;
    status: AccessGrantStatus;
  }> = [];
  const rentalCreates: Array<{
    userId: string;
    bookId: string;
    orderItemId: string;
    type: AccessGrantType;
    startsAt: Date;
    expiresAt: Date;
    status: AccessGrantStatus;
  }> = [];
  const rentalCreateIndexByOrderItemId = new Map<string, number>();
  const rentalUpdatesById = new Map<string, Date>();

  for (const item of orderItems) {
    const type = mapOfferTypeToGrantType(item.offerType);

    if (type === AccessGrantType.PURCHASE) {
      if (activePurchaseBooks.has(item.bookId)) {
        continue;
      }

      purchaseCreates.push({
        userId: input.userId,
        bookId: item.bookId,
        orderItemId: item.id,
        type: AccessGrantType.PURCHASE,
        startsAt: grantedAt,
        status: AccessGrantStatus.ACTIVE,
      });
      activePurchaseBooks.add(item.bookId);

      continue;
    }

    if (!hasValidRentalDays(item.offerType, item.rentalDays)) {
      throw new Error("INVALID_RENTAL_DAYS");
    }
    const rentalDays = item.rentalDays as number;

    const existingActiveRentalForBook = activeRentalByBook.get(item.bookId);

    if (existingActiveRentalForBook) {
      const rentalBaseDate =
        existingActiveRentalForBook.expiresAt && existingActiveRentalForBook.expiresAt > grantedAt
          ? existingActiveRentalForBook.expiresAt
          : grantedAt;

      const nextExpiresAt = addDays(rentalBaseDate, rentalDays);
      existingActiveRentalForBook.expiresAt = nextExpiresAt;

      if (existingActiveRentalForBook.id) {
        rentalUpdatesById.set(existingActiveRentalForBook.id, nextExpiresAt);
      } else if (existingActiveRentalForBook.createdFromOrderItemId) {
        const pendingCreateIndex = rentalCreateIndexByOrderItemId.get(existingActiveRentalForBook.createdFromOrderItemId);
        if (pendingCreateIndex !== undefined) {
          rentalCreates[pendingCreateIndex]!.expiresAt = nextExpiresAt;
        }
      }

      continue;
    }

    const expiresAt = addDays(grantedAt, rentalDays);
    rentalCreates.push({
      userId: input.userId,
      bookId: item.bookId,
      orderItemId: item.id,
      type: AccessGrantType.RENTAL,
      startsAt: grantedAt,
      expiresAt,
      status: AccessGrantStatus.ACTIVE,
    });
    rentalCreateIndexByOrderItemId.set(item.id, rentalCreates.length - 1);
    activeRentalByBook.set(item.bookId, {
      createdFromOrderItemId: item.id,
      expiresAt,
    });
  }

  for (const create of purchaseCreates) {
    await tx.accessGrant.upsert({
      where: {
        userId_orderItemId_type: {
          userId: input.userId,
          orderItemId: create.orderItemId,
          type: AccessGrantType.PURCHASE,
        },
      },
      update: {},
      create,
    });
  }

  for (const [grantId, expiresAt] of rentalUpdatesById) {
    await tx.accessGrant.update({
      where: { id: grantId },
      data: { expiresAt },
    });
  }

  for (const create of rentalCreates) {
    await tx.accessGrant.upsert({
      where: {
        userId_orderItemId_type: {
          userId: input.userId,
          orderItemId: create.orderItemId,
          type: AccessGrantType.RENTAL,
        },
      },
      update: {},
      create,
    });
  }
}
