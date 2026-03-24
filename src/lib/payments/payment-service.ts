import { Prisma, OrderStatus, PaymentProvider, PaymentStatus, type PaymentAttemptStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolvePaymentGateway } from "@/lib/payments/gateways";
import { isMockPaymentVerificationEnabled } from "@/lib/payments/mock-mode";
import { ensurePaymentStatusTransition } from "@/lib/payments/status-flow";
import { grantAccessForPaidOrder } from "@/lib/access-grants";
import { normalizeNonNegativeMoneyCents, normalizeProviderReference } from "@/lib/services/invariants";

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

  const result = await prisma.$transaction(async (tx) => {
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
      throw new Error("ORDER_NOT_FOUND");
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new Error("ORDER_NOT_PAYABLE");
    }

    if (normalizeNonNegativeMoneyCents(order.totalCents) === null) {
      throw new Error("INVALID_ORDER_TOTAL");
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
      throw new Error("INVALID_PROVIDER_REFERENCE");
    }

    const conflictingAttempt = await tx.paymentAttempt.findFirst({
      where: {
        provider: input.provider,
        providerReference,
        id: { not: attempt.id },
      },
      select: { id: true },
    });

    if (conflictingAttempt) {
      throw new Error("DUPLICATE_PROVIDER_REFERENCE");
    }

    const conflictingPayment = await tx.payment.findFirst({
      where: {
        provider: input.provider,
        providerRef: providerReference,
        id: { not: payment.id },
      },
      select: { id: true },
    });

    if (conflictingPayment) {
      throw new Error("DUPLICATE_PROVIDER_REFERENCE");
    }

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
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch((error: unknown) => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new Error("DUPLICATE_PROVIDER_REFERENCE");
    }
    throw error;
  });

  return result;
}

export async function submitPaymentProof(input: SubmitPaymentProofInput) {
  if (!input.attemptId.trim() || !input.transactionReference.trim()) {
    throw new Error("INVALID_PAYMENT_PROOF_INPUT");
  }

  const attempt = await prisma.paymentAttempt.findFirst({
    where: {
      id: input.attemptId,
      userId: input.userId,
    },
  });

  if (!attempt) {
    throw new Error("ATTEMPT_NOT_FOUND");
  }

  if (attempt.status !== "SUBMITTED") {
    throw new Error("ATTEMPT_NOT_SUBMITTABLE");
  }

  const existingPayload =
    attempt.requestPayload && typeof attempt.requestPayload === "object" && !Array.isArray(attempt.requestPayload)
      ? (attempt.requestPayload as Record<string, unknown>)
      : {};

  const requestPayload: Prisma.InputJsonValue = {
    ...existingPayload,
    source: "api/payments/submit-proof",
    transactionReference: input.transactionReference.trim(),
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
    throw new Error("MOCK_VERIFICATION_DISABLED");
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
    throw new Error("ATTEMPT_NOT_FOUND");
  }

  if (attempt.status === "PAID" || attempt.status === "FAILED") {
    return attempt;
  }

  const verifyingStatus: PaymentAttemptStatus = "VERIFYING";
  ensurePaymentStatusTransition(attempt.status, verifyingStatus);

  const transactionReference = extractTransactionReference(attempt.requestPayload);

  if (!attempt.providerReference) {
    throw new Error("MISSING_PROVIDER_REFERENCE");
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
      throw new Error("ATTEMPT_NOT_FOUND");
    }

    if (latestAttempt.status === "PAID" || latestAttempt.status === "FAILED") {
      return latestAttempt;
    }

    throw new Error("ATTEMPT_ALREADY_VERIFYING");
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

    const paymentStatus = gatewayResult.isPaid ? PaymentStatus.SUCCEEDED : PaymentStatus.FAILED;

    await tx.payment.update({
      where: { id: attempt.paymentId },
      data: {
        status: paymentStatus,
        paidAt: gatewayResult.isPaid ? new Date() : null,
        failedAt: gatewayResult.isPaid ? null : new Date(),
      },
    });

    const paidAt = gatewayResult.isPaid ? new Date() : null;

    await tx.order.update({
      where: { id: attempt.orderId },
      data: {
        status: gatewayResult.isPaid ? OrderStatus.PAID : OrderStatus.PENDING,
        placedAt: paidAt,
      },
    });

    if (gatewayResult.isPaid) {
      await grantAccessForPaidOrder(tx, {
        orderId: attempt.orderId,
        userId: attempt.userId,
        grantedAt: paidAt ?? new Date(),
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
