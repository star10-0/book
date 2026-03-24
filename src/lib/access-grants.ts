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

  for (const item of orderItems) {
    const type = mapOfferTypeToGrantType(item.offerType);

    if (type === AccessGrantType.PURCHASE) {
      const existingPurchaseForBook = await tx.accessGrant.findFirst({
        where: {
          userId: input.userId,
          bookId: item.bookId,
          type: AccessGrantType.PURCHASE,
          status: AccessGrantStatus.ACTIVE,
        },
        select: { id: true },
      });

      if (existingPurchaseForBook) {
        continue;
      }

      await tx.accessGrant.upsert({
        where: {
          userId_orderItemId_type: {
            userId: input.userId,
            orderItemId: item.id,
            type,
          },
        },
        update: {},
        create: {
          userId: input.userId,
          bookId: item.bookId,
          orderItemId: item.id,
          type,
          startsAt: grantedAt,
          status: AccessGrantStatus.ACTIVE,
        },
      });

      continue;
    }

    if (!hasValidRentalDays(item.offerType, item.rentalDays)) {
      throw new Error("INVALID_RENTAL_DAYS");
    }
    const rentalDays = item.rentalDays as number;

    const existingActiveRentalForBook = await tx.accessGrant.findFirst({
      where: {
        userId: input.userId,
        bookId: item.bookId,
        type: AccessGrantType.RENTAL,
        status: AccessGrantStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gt: grantedAt } }],
      },
      select: {
        id: true,
        expiresAt: true,
      },
    });

    if (existingActiveRentalForBook) {
      const rentalBaseDate =
        existingActiveRentalForBook.expiresAt && existingActiveRentalForBook.expiresAt > grantedAt
          ? existingActiveRentalForBook.expiresAt
          : grantedAt;

      await tx.accessGrant.update({
        where: { id: existingActiveRentalForBook.id },
        data: {
          expiresAt: addDays(rentalBaseDate, rentalDays),
        },
      });

      continue;
    }

    await tx.accessGrant.upsert({
      where: {
        userId_orderItemId_type: {
          userId: input.userId,
          orderItemId: item.id,
          type,
        },
      },
      update: {},
      create: {
        userId: input.userId,
        bookId: item.bookId,
        orderItemId: item.id,
        type,
        startsAt: grantedAt,
        expiresAt: addDays(grantedAt, rentalDays),
        status: AccessGrantStatus.ACTIVE,
      },
    });
  }
}
