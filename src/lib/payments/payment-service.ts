import { Prisma, PaymentStatus, type PaymentAttemptStatus, type PaymentProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolvePaymentGateway } from "@/lib/payments/gateways";
import { isMockPaymentVerificationEnabled } from "@/lib/payments/mock-mode";
import {
  canTransitionPaymentStatus,
  deriveOrderStatusFromPaymentStatus,
  ensurePaymentStatusTransition,
} from "@/lib/payments/status-flow";
import { grantAccessForPaidOrder } from "@/lib/access-grants";
import { normalizeNonNegativeMoneyCents, normalizeProviderReference } from "@/lib/services/invariants";
import { PAYMENT_ERROR_CODES, paymentError } from "@/lib/payments/errors";
import { markPromoRedemptionsRedeemed } from "@/lib/promos";

export interface CreatePaymentForOrderInput {
  orderId: string;
  userId: string;
  provider: PaymentProvider;
}

export interface VerifyPaymentInput {
  attemptId: string;
  userId: string;
  mockOutcome?: "paid" | "failed";
}

export interface SubmitPaymentProofInput {
  attemptId: string;
  userId: string;
  transactionReference: string;
  proofNote?: string;
}

export async function createPaymentForOrder(input: CreatePaymentForOrderInput) {
  const gateway = resolvePaymentGateway(input.provider);

  const result = await prisma
    .$transaction(
      async (tx) => {
        const order = await tx.order.findFirst({
          where: {
            id: input.orderId,
            userId: input.userId,
          },
          select: {
            id: true,
            userId: true,
            totalCents: true,
            currency: true,
            status: true,
          },
        });

        if (!order) {
          paymentError(PAYMENT_ERROR_CODES.orderNotFound);
        }

        if (order.status !== "PENDING") {
          paymentError(PAYMENT_ERROR_CODES.orderNotPayable);
        }

        if (normalizeNonNegativeMoneyCents(order.totalCents) === null) {
          paymentError(PAYMENT_ERROR_CODES.invalidOrderTotal);
        }

        const existingAttempt = await tx.paymentAttempt.findFirst({
          where: {
            orderId: order.id,
            userId: order.userId,
            provider: input.provider,
            status: {
              in: ["PENDING", "SUBMITTED", "VERIFYING"],
            },
          },
          orderBy: { createdAt: "desc" },
          include: {
            payment: true,
          },
        });

        if (existingAttempt) {
          return {
            payment: existingAttempt.payment,
            attempt: existingAttempt,
            checkoutUrl: undefined,
            reused: true,
          };
        }

        const payment = await tx.payment.create({
          data: {
            userId: order.userId,
            orderId: order.id,
            provider: input.provider,
            amountCents: order.totalCents,
            currency: order.currency,
            status: PaymentStatus.PENDING,
          },
        });

        const attempt = await tx.paymentAttempt.create({
          data: {
            paymentId: payment.id,
            userId: order.userId,
            orderId: order.id,
            provider: input.provider,
            amountCents: order.totalCents,
            currency: order.currency,
            status: "PENDING",
            requestPayload: {
              source: "api/payments/create",
            },
          },
        });

        const gatewayResponse = await gateway.createPayment({
          paymentId: payment.id,
          orderId: order.id,
          amountCents: order.totalCents,
          currency: order.currency,
          customerId: order.userId,
        });

        ensurePaymentStatusTransition(attempt.status, "SUBMITTED");

        const providerReference = normalizeProviderReference(gatewayResponse.providerReference);
        if (!providerReference) {
          paymentError(PAYMENT_ERROR_CODES.invalidProviderReference);
        }

        await ensureProviderReferenceIntegrity({
          tx,
          provider: input.provider,
          providerReference,
          currentAttemptId: attempt.id,
          currentPaymentId: payment.id,
        });

        const submittedAttempt = await tx.paymentAttempt.update({
          where: { id: attempt.id },
          data: {
            status: "SUBMITTED",
            providerReference,
            responsePayload: gatewayResponse.rawPayload as Prisma.InputJsonValue | undefined,
          },
        });

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            providerRef: providerReference,
          },
        });

        return {
          payment,
          attempt: submittedAttempt,
          checkoutUrl: gatewayResponse.checkoutUrl,
          reused: false,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    )
    .catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        paymentError(PAYMENT_ERROR_CODES.duplicateProviderReference);
      }
      throw error;
    });

  return result;
}

export async function submitPaymentProof(input: SubmitPaymentProofInput) {
  if (!input.attemptId.trim() || !input.transactionReference.trim()) {
    paymentError(PAYMENT_ERROR_CODES.invalidPaymentProofInput);
  }

  const attempt = await prisma.paymentAttempt.findFirst({
    where: {
      id: input.attemptId,
      userId: input.userId,
    },
  });

  if (!attempt) {
    paymentError(PAYMENT_ERROR_CODES.attemptNotFound);
  }

  if (attempt.status !== "SUBMITTED") {
    paymentError(PAYMENT_ERROR_CODES.attemptNotSubmittable);
  }

  if (!attempt.providerReference) {
    paymentError(PAYMENT_ERROR_CODES.missingProviderReference);
  }

  const existingTransactionReference = extractTransactionReference(attempt.requestPayload);
  const normalizedTransactionReference = input.transactionReference.trim();

  if (
    existingTransactionReference &&
    existingTransactionReference.toLowerCase() !== normalizedTransactionReference.toLowerCase()
  ) {
    paymentError(PAYMENT_ERROR_CODES.paymentProofImmutable);
  }

  const existingPayload =
    attempt.requestPayload && typeof attempt.requestPayload === "object" && !Array.isArray(attempt.requestPayload)
      ? (attempt.requestPayload as Record<string, unknown>)
      : {};

  const requestPayload: Prisma.InputJsonValue = {
    ...existingPayload,
    source: "api/payments/submit-proof",
    transactionReference: existingTransactionReference ?? normalizedTransactionReference,
    proofNote: input.proofNote?.trim() || null,
    submittedAt: new Date().toISOString(),
  };

  return prisma.paymentAttempt.update({
    where: { id: attempt.id },
    data: {
      requestPayload,
    },
  });
}

export async function verifyPayment(input: VerifyPaymentInput) {
  if (typeof input.mockOutcome !== "undefined" && !isMockPaymentVerificationEnabled()) {
    paymentError(PAYMENT_ERROR_CODES.mockVerificationDisabled);
  }

  const attempt = await prisma.paymentAttempt.findFirst({
    where: {
      id: input.attemptId,
      userId: input.userId,
    },
    include: {
      payment: true,
      order: true,
    },
  });

  if (!attempt) {
    paymentError(PAYMENT_ERROR_CODES.attemptNotFound);
  }

  if (attempt.status === "PAID" || attempt.status === "FAILED") {
    return attempt;
  }

  const verifyingStatus: PaymentAttemptStatus = "VERIFYING";
  ensurePaymentStatusTransition(attempt.status, verifyingStatus);

  const transactionReference = extractTransactionReference(attempt.requestPayload);

  if (!attempt.providerReference) {
    paymentError(PAYMENT_ERROR_CODES.missingProviderReference);
  }

  if (attempt.payment.providerRef && attempt.payment.providerRef !== attempt.providerReference) {
    paymentError(PAYMENT_ERROR_CODES.providerReferenceIntegrityMismatch);
  }

  const providerReference = attempt.providerReference;

  const claimVerification = await prisma.paymentAttempt.updateMany({
    where: {
      id: attempt.id,
      status: attempt.status,
    },
    data: {
      status: verifyingStatus,
    },
  });

  if (claimVerification.count === 0) {
    const latestAttempt = await prisma.paymentAttempt.findUnique({
      where: { id: attempt.id },
      include: {
        payment: true,
        order: true,
      },
    });

    if (!latestAttempt) {
      paymentError(PAYMENT_ERROR_CODES.attemptNotFound);
    }

    if (latestAttempt.status === "PAID" || latestAttempt.status === "FAILED") {
      return latestAttempt;
    }

    paymentError(PAYMENT_ERROR_CODES.attemptAlreadyVerifying);
  }

  const gateway = resolvePaymentGateway(attempt.provider);

  const gatewayResult = await (async () => {
    try {
      return await gateway.verifyPayment({
        paymentId: attempt.paymentId,
        providerReference,
        transactionReference,
        mockOutcome: input.mockOutcome,
      });
    } catch (error) {
      await prisma.paymentAttempt.updateMany({
        where: {
          id: attempt.id,
          status: verifyingStatus,
        },
        data: {
          status: attempt.status,
        },
      });

      throw error;
    }
  })();

  const finalAttemptStatus: PaymentAttemptStatus = gatewayResult.isPaid ? "PAID" : "FAILED";

  return prisma.$transaction(async (tx) => {
    ensurePaymentStatusTransition(verifyingStatus, finalAttemptStatus);

    const finalizedAttempt = await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: finalAttemptStatus,
        verifiedAt: new Date(),
        responsePayload: gatewayResult.rawPayload as Prisma.InputJsonValue | undefined,
        failureReason: gatewayResult.failureReason,
      },
    });

    const desiredPaymentStatus = gatewayResult.isPaid ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;

    const latestPayment = await tx.payment.findUnique({
      where: { id: attempt.paymentId },
      select: { id: true, status: true, providerRef: true },
    });

    if (!latestPayment) {
      paymentError(PAYMENT_ERROR_CODES.attemptNotFound);
    }

    if (latestPayment.providerRef && latestPayment.providerRef !== providerReference) {
      paymentError(PAYMENT_ERROR_CODES.providerReferenceIntegrityMismatch);
    }

    const paymentUpdateData = buildPaymentUpdateData({
      currentStatus: latestPayment.status,
      desiredStatus: desiredPaymentStatus,
      providerReference,
    });

    if (paymentUpdateData) {
      await tx.payment.update({
        where: { id: attempt.paymentId },
        data: paymentUpdateData,
      });

      const nextOrderStatus = deriveOrderStatusFromPaymentStatus(desiredPaymentStatus);

      await tx.order.update({
        where: { id: attempt.orderId },
        data: {
          status: nextOrderStatus,
          placedAt: desiredPaymentStatus === PaymentStatus.SUCCEEDED ? new Date() : attempt.order.placedAt,
        },
      });
    }

    if (gatewayResult.isPaid) {
      await grantAccessForPaidOrder(tx, {
        orderId: attempt.orderId,
        userId: attempt.userId,
        grantedAt: new Date(),
      });

      await markPromoRedemptionsRedeemed(tx, {
        orderId: attempt.orderId,
        paymentId: attempt.paymentId,
        at: new Date(),
      });
    }

    return finalizedAttempt;
  });
}

function extractTransactionReference(payload: Prisma.JsonValue | null): string | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  const value = (payload as Record<string, unknown>).transactionReference;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function buildPaymentUpdateData(input: {
  currentStatus: PaymentStatus;
  desiredStatus: PaymentStatus;
  providerReference: string;
}): Prisma.PaymentUpdateInput | null {
  if (input.currentStatus === input.desiredStatus) {
    return {
      providerRef: input.providerReference,
    };
  }

  if (!canTransitionPaymentStatus(input.currentStatus, input.desiredStatus)) {
    return null;
  }

  if (input.desiredStatus === PaymentStatus.SUCCEEDED) {
    return {
      status: PaymentStatus.SUCCEEDED,
      providerRef: input.providerReference,
      paidAt: new Date(),
      failedAt: null,
    };
  }

  if (input.desiredStatus === PaymentStatus.FAILED) {
    return {
      status: PaymentStatus.FAILED,
      providerRef: input.providerReference,
      failedAt: new Date(),
    };
  }

  return {
    status: input.desiredStatus,
    providerRef: input.providerReference,
  };
}

async function ensureProviderReferenceIntegrity(input: {
  tx: Prisma.TransactionClient;
  provider: PaymentProvider;
  providerReference: string;
  currentAttemptId: string;
  currentPaymentId: string;
}) {
  const conflictingAttempt = await input.tx.paymentAttempt.findFirst({
    where: {
      provider: input.provider,
      providerReference: input.providerReference,
      id: { not: input.currentAttemptId },
    },
    select: { id: true },
  });

  if (conflictingAttempt) {
    paymentError(PAYMENT_ERROR_CODES.duplicateProviderReference);
  }

  const conflictingPayment = await input.tx.payment.findFirst({
    where: {
      provider: input.provider,
      providerRef: input.providerReference,
      id: { not: input.currentPaymentId },
    },
    select: { id: true },
  });

  if (conflictingPayment) {
    paymentError(PAYMENT_ERROR_CODES.duplicateProviderReference);
  }
}
