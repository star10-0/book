import { Prisma, OrderStatus, PaymentProvider, PaymentStatus, type PaymentAttemptStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolvePaymentGateway } from "@/lib/payments/gateways";
import { isMockPaymentVerificationEnabled } from "@/lib/payments/mock-mode";
import { ensurePaymentStatusTransition } from "@/lib/payments/status-flow";
import { grantAccessForPaidOrder } from "@/lib/access-grants";
import { isNonNegativeInteger } from "@/lib/services/invariants";

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
  const order = await prisma.order.findFirst({
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

  if (!isNonNegativeInteger(order.totalCents)) {
    throw new Error("INVALID_ORDER_TOTAL");
  }

  const gateway = resolvePaymentGateway(input.provider);

  const existingAttempt = await prisma.paymentAttempt.findFirst({
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
    };
  }

  const result = await prisma.$transaction(async (tx) => {
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

    const conflictingAttempt = await tx.paymentAttempt.findFirst({
      where: {
        provider: input.provider,
        providerReference: gatewayResponse.providerReference,
        id: { not: attempt.id },
      },
      select: { id: true },
    });

    if (conflictingAttempt) {
      throw new Error("DUPLICATE_PROVIDER_REFERENCE");
    }

    const submittedAttempt = await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "SUBMITTED",
        providerReference: gatewayResponse.providerReference,
        responsePayload: gatewayResponse.rawPayload as Prisma.InputJsonValue | undefined,
      },
    });

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        providerRef: gatewayResponse.providerReference,
      },
    });

    return {
      payment,
      attempt: submittedAttempt,
      checkoutUrl: gatewayResponse.checkoutUrl,
    };
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

  const gateway = resolvePaymentGateway(attempt.provider);

  const verifyingStatus: PaymentAttemptStatus = "VERIFYING";
  ensurePaymentStatusTransition(attempt.status, verifyingStatus);

  const transactionReference = extractTransactionReference(attempt.requestPayload);

  if (!attempt.providerReference) {
    throw new Error("MISSING_PROVIDER_REFERENCE");
  }

  const gatewayResult = await gateway.verifyPayment({
    paymentId: attempt.paymentId,
    providerReference: attempt.providerReference,
    transactionReference,
    mockOutcome: input.mockOutcome,
  });

  const finalAttemptStatus: PaymentAttemptStatus = gatewayResult.isPaid ? "PAID" : "FAILED";

  return prisma.$transaction(async (tx) => {
    await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: verifyingStatus,
      },
    });

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
