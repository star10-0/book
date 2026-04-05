import { Prisma, PaymentStatus, type PaymentAttemptStatus, type PaymentProvider } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolvePaymentGateway } from "@/lib/payments/gateways";
import { sanitizeForLogs } from "@/lib/observability/redaction";
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

type AttemptWithRelations = Prisma.PaymentAttemptGetPayload<{
  include: {
    payment: true;
    order: true;
  };
}>;

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

        if (order.totalCents === 0) {
          paymentError(PAYMENT_ERROR_CODES.zeroAmountOrder);
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
            responsePayload: sanitizePayloadForStorage(gatewayResponse.rawPayload),
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

  if (attempt.amountCents === 0) {
    paymentError(PAYMENT_ERROR_CODES.zeroAmountOrder);
  }

  if (!attempt.providerReference) {
    paymentError(PAYMENT_ERROR_CODES.missingProviderReference);
  }

  const existingCanonicalTransactionReference = resolveCanonicalTransactionReference({
    transactionReference: attempt.transactionReference,
    requestPayload: attempt.requestPayload,
  });
  const existingSubmittedTransactionReference = extractTransactionReference(attempt.requestPayload);
  const normalizedTransactionReference = input.transactionReference.trim();
  const canonicalTransactionReference = normalizeTransactionReference(input.transactionReference);

  if (
    existingCanonicalTransactionReference &&
    existingCanonicalTransactionReference !== canonicalTransactionReference
  ) {
    paymentError(PAYMENT_ERROR_CODES.paymentProofImmutable);
  }

  const relatedAttempts = await findAttemptsByTransactionReference({
    transactionReferenceCanonical: canonicalTransactionReference,
    excludeAttemptId: attempt.id,
  });

  const txUsage = classifyTransactionReferenceUsage({
    currentAttempt: {
      id: attempt.id,
      userId: attempt.userId,
      orderId: attempt.orderId,
    },
    relatedAttempts,
  });

  if (txUsage.decision === "reject_paid_elsewhere") {
    paymentError(PAYMENT_ERROR_CODES.transactionReferenceAlreadyPaidElsewhere);
  }

  if (txUsage.decision === "reject_currently_verifying") {
    paymentError(PAYMENT_ERROR_CODES.transactionReferenceCurrentlyVerifying);
  }

  if (txUsage.decision === "reuse_recoverable_attempt") {
    return prisma.paymentAttempt.findUniqueOrThrow({ where: { id: txUsage.recoverableAttemptId } });
  }

  const existingPayload =
    attempt.requestPayload && typeof attempt.requestPayload === "object" && !Array.isArray(attempt.requestPayload)
      ? (attempt.requestPayload as Record<string, unknown>)
      : {};

  const requestPayload: Prisma.InputJsonValue = {
    ...existingPayload,
    source: "api/payments/submit-proof",
    transactionReference: existingSubmittedTransactionReference ?? normalizedTransactionReference,
    proofNote: input.proofNote?.trim() || null,
    submittedAt: new Date().toISOString(),
  };

  return prisma.paymentAttempt.update({
    where: { id: attempt.id },
    data: {
      requestPayload,
      transactionReference: canonicalTransactionReference,
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

  if (attempt.status === "PAID") {
    return attempt;
  }

  if (attempt.order.status !== "PENDING") {
    paymentError(PAYMENT_ERROR_CODES.orderNotPayable);
  }

  const canonicalTransactionReference = resolveCanonicalTransactionReference({
    transactionReference: attempt.transactionReference,
    requestPayload: attempt.requestPayload,
  });
  const submittedTransactionReference = extractTransactionReference(attempt.requestPayload) ?? canonicalTransactionReference;

  if (attempt.status === "FAILED" && !canonicalTransactionReference) {
    return attempt;
  }

  const verifyingStatus: PaymentAttemptStatus = "VERIFYING";
  ensurePaymentStatusTransition(attempt.status, verifyingStatus);

  if (!attempt.providerReference) {
    paymentError(PAYMENT_ERROR_CODES.missingProviderReference);
  }

  if (attempt.payment.providerRef && attempt.payment.providerRef !== attempt.providerReference) {
    paymentError(PAYMENT_ERROR_CODES.providerReferenceIntegrityMismatch);
  }

  const providerReference = attempt.providerReference;

  if (canonicalTransactionReference) {
    const relatedAttempts = await findAttemptsByTransactionReference({
      transactionReferenceCanonical: canonicalTransactionReference,
      excludeAttemptId: attempt.id,
    });

    const txUsage = classifyTransactionReferenceUsage({
      currentAttempt: {
        id: attempt.id,
        userId: attempt.userId,
        orderId: attempt.orderId,
      },
      relatedAttempts,
    });

    if (txUsage.decision === "reject_paid_elsewhere") {
      paymentError(PAYMENT_ERROR_CODES.transactionReferenceAlreadyPaidElsewhere);
    }

    if (txUsage.decision === "reject_currently_verifying") {
      paymentError(PAYMENT_ERROR_CODES.transactionReferenceCurrentlyVerifying);
    }
  }

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
        transactionReference: submittedTransactionReference,
        mockOutcome: input.mockOutcome,
        expectedAmountCents: attempt.amountCents,
        expectedCurrency: attempt.currency,
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

  const mismatchDiagnostic = await diagnoseProviderMismatch({
    attempt,
    transactionReference: submittedTransactionReference,
    selectedProviderFailureReason: gatewayResult.failureReason,
    selectedProviderPaid: gatewayResult.isPaid,
  });

  const finalizedFailureReason = buildFinalFailureReason({
    attemptProvider: attempt.provider,
    gatewayResultFailureReason: gatewayResult.failureReason,
    mismatchDiagnostic,
  });

  const finalAttemptStatus: PaymentAttemptStatus = gatewayResult.isPaid ? "PAID" : "FAILED";

  return prisma.$transaction(async (tx) => {
    ensurePaymentStatusTransition(verifyingStatus, finalAttemptStatus);

    const finalizedAttempt = await tx.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: finalAttemptStatus,
        verifiedAt: new Date(),
        responsePayload: buildVerificationResponsePayload({
          rawPayload: gatewayResult.rawPayload,
          mismatchDiagnostic,
        }),
        failureReason: finalizedFailureReason,
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

type ProviderMismatchDiagnostic = {
  code: "provider_mismatch_possible" | "tx_not_found_in_selected_provider";
  selectedProvider: PaymentProvider;
  suggestedProvider?: PaymentProvider;
  txReference: string;
};

function buildVerificationResponsePayload(input: {
  rawPayload?: Record<string, unknown>;
  mismatchDiagnostic?: ProviderMismatchDiagnostic;
}): Prisma.InputJsonValue | undefined {
  const sanitizedRawPayload = sanitizePayloadForStorage(input.rawPayload);
  const hasDiagnostic = Boolean(input.mismatchDiagnostic);

  if (!sanitizedRawPayload && !hasDiagnostic) {
    return undefined;
  }

  if (!hasDiagnostic) {
    return sanitizedRawPayload;
  }

  return {
    providerVerification: sanitizedRawPayload ?? null,
    diagnostic: input.mismatchDiagnostic,
  } satisfies Prisma.InputJsonValue;
}

async function diagnoseProviderMismatch(input: {
  attempt: AttemptWithRelations;
  transactionReference?: string;
  selectedProviderFailureReason?: string;
  selectedProviderPaid: boolean;
}): Promise<ProviderMismatchDiagnostic | undefined> {
  if (!input.transactionReference || input.selectedProviderPaid) {
    return undefined;
  }

  if (!isTransactionNotFoundInSelectedProvider(input.selectedProviderFailureReason, input.attempt.provider)) {
    return undefined;
  }

  const alternateProvider = getAlternateManualProvider(input.attempt.provider);

  if (!alternateProvider) {
    return {
      code: "tx_not_found_in_selected_provider",
      selectedProvider: input.attempt.provider,
      txReference: input.transactionReference,
    };
  }

  const alternateGateway = resolvePaymentGateway(alternateProvider);

  try {
    const alternateResult = await alternateGateway.verifyPayment({
      paymentId: input.attempt.paymentId,
      providerReference: input.attempt.providerReference ?? "",
      transactionReference: input.transactionReference,
      expectedAmountCents: input.attempt.amountCents,
      expectedCurrency: input.attempt.currency,
    });

    if (!alternateResult.isPaid) {
      return {
        code: "tx_not_found_in_selected_provider",
        selectedProvider: input.attempt.provider,
        txReference: input.transactionReference,
      };
    }

    return {
      code: "provider_mismatch_possible",
      selectedProvider: input.attempt.provider,
      suggestedProvider: alternateProvider,
      txReference: input.transactionReference,
    };
  } catch {
    return {
      code: "tx_not_found_in_selected_provider",
      selectedProvider: input.attempt.provider,
      txReference: input.transactionReference,
    };
  }
}

function isTransactionNotFoundInSelectedProvider(failureReason: string | undefined, provider: PaymentProvider) {
  if (!failureReason) {
    return false;
  }

  const normalized = failureReason.toLowerCase();

  if (provider === "SHAM_CASH") {
    return normalized.includes("did not find")
      || normalized.includes("not find")
      || normalized.includes("not found")
      || normalized.includes("submitted transaction reference");
  }

  if (provider === "SYRIATEL_CASH") {
    return normalized.includes("not found")
      || normalized.includes("did not find")
      || normalized.includes("not found in syriatel");
  }

  return false;
}

function getAlternateManualProvider(provider: PaymentProvider): PaymentProvider | undefined {
  if (provider === "SHAM_CASH") return "SYRIATEL_CASH";
  if (provider === "SYRIATEL_CASH") return "SHAM_CASH";
  return undefined;
}

function buildFinalFailureReason(input: {
  attemptProvider: PaymentProvider;
  gatewayResultFailureReason?: string;
  mismatchDiagnostic?: ProviderMismatchDiagnostic;
}) {
  if (input.mismatchDiagnostic?.code === "provider_mismatch_possible" && input.mismatchDiagnostic.suggestedProvider) {
    if (input.attemptProvider === "SYRIATEL_CASH" && input.mismatchDiagnostic.suggestedProvider === "SHAM_CASH") {
      return "لم يتم العثور على رقم العملية ضمن سجل Syriatel Cash. إذا كانت الدفعة أُرسلت عبر Sham Cash، اختر وسيلة Sham Cash وأدخل رقم العملية الخاص بها.";
    }

    if (input.attemptProvider === "SHAM_CASH" && input.mismatchDiagnostic.suggestedProvider === "SYRIATEL_CASH") {
      return "لم يتم العثور على رقم العملية ضمن سجل Sham Cash. إذا كانت الدفعة أُرسلت عبر Syriatel Cash، اختر وسيلة Syriatel Cash وأدخل رقم العملية الخاص بها.";
    }
  }

  if (input.mismatchDiagnostic?.code === "tx_not_found_in_selected_provider") {
    if (input.attemptProvider === "SYRIATEL_CASH") {
      return "لم يتم العثور على رقم العملية ضمن سجل Syriatel Cash. تأكد من رقم العملية ووسيلة الدفع المختارة ثم أعد المحاولة.";
    }

    if (input.attemptProvider === "SHAM_CASH") {
      return "لم يتم العثور على رقم العملية ضمن سجل Sham Cash. تأكد من رقم العملية ووسيلة الدفع المختارة ثم أعد المحاولة.";
    }
  }

  return input.gatewayResultFailureReason;
}

function sanitizePayloadForStorage(payload: Record<string, unknown> | undefined): Prisma.InputJsonValue | undefined {
  if (!payload) {
    return undefined;
  }

  return sanitizeForLogs(payload) as Prisma.InputJsonValue;
}


export async function verifyPaymentByProviderReference(input: { provider: PaymentProvider; providerReference: string }) {
  const attempt = await prisma.paymentAttempt.findFirst({
    where: {
      provider: input.provider,
      providerReference: input.providerReference.trim(),
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, userId: true },
  });

  if (!attempt) {
    paymentError(PAYMENT_ERROR_CODES.attemptNotFound);
  }

  return verifyPayment({
    attemptId: attempt.id,
    userId: attempt.userId,
  });
}

export async function reconcilePaymentByTransactionReference(input: {
  userId: string;
  transactionReference: string;
  attemptId?: string;
  mockOutcome?: "paid" | "failed";
}) {
  const canonicalTransactionReference = normalizeTransactionReference(input.transactionReference);
  if (!canonicalTransactionReference) {
    paymentError(PAYMENT_ERROR_CODES.invalidPaymentProofInput);
  }

  const relatedAttempts = await findAttemptsByTransactionReference({
    transactionReferenceCanonical: canonicalTransactionReference,
  });

  if (relatedAttempts.length === 0) {
    paymentError(PAYMENT_ERROR_CODES.transactionReferenceNotFound);
  }

  const candidate = pickReconciliationCandidate({
    attempts: relatedAttempts,
    userId: input.userId,
    preferredAttemptId: input.attemptId?.trim() || undefined,
  });

  if (!candidate) {
    paymentError(PAYMENT_ERROR_CODES.transactionReferenceNotFound);
  }

  const txUsage = classifyTransactionReferenceUsage({
    currentAttempt: {
      id: candidate.id,
      userId: candidate.userId,
      orderId: candidate.orderId,
    },
    relatedAttempts: relatedAttempts.filter((attempt) => attempt.id !== candidate.id),
  });

  if (txUsage.decision === "reject_paid_elsewhere") {
    paymentError(PAYMENT_ERROR_CODES.transactionReferenceAlreadyPaidElsewhere);
  }

  if (txUsage.decision === "reject_currently_verifying") {
    paymentError(PAYMENT_ERROR_CODES.transactionReferenceCurrentlyVerifying);
  }

  return verifyPayment({
    attemptId: candidate.id,
    userId: candidate.userId,
    mockOutcome: input.mockOutcome,
  });
}

export async function recoverPaymentAttempt(input: {
  attemptId: string;
  userId: string;
  transactionReference?: string;
  mockOutcome?: "paid" | "failed";
}) {
  const attemptId = input.attemptId.trim();
  const userId = input.userId.trim();
  const transactionReference = input.transactionReference?.trim();

  if (!attemptId || !userId) {
    paymentError(PAYMENT_ERROR_CODES.invalidPaymentProofInput);
  }

  const attempt = await prisma.paymentAttempt.findFirst({
    where: { id: attemptId, userId },
    include: { payment: true, order: true },
  });

  if (!attempt) {
    paymentError(PAYMENT_ERROR_CODES.attemptNotFound);
  }

  if (attempt.status === "PAID" || attempt.payment.status === "SUCCEEDED") {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: attempt.orderId },
        data: { status: "PAID", placedAt: attempt.order.placedAt ?? new Date() },
      });
      await tx.payment.update({
        where: { id: attempt.paymentId },
        data: { status: "SUCCEEDED", paidAt: attempt.payment.paidAt ?? new Date(), failedAt: null },
      });
      await grantAccessForPaidOrder(tx, { orderId: attempt.orderId, userId: attempt.userId, grantedAt: new Date() });
      await markPromoRedemptionsRedeemed(tx, {
        orderId: attempt.orderId,
        paymentId: attempt.paymentId,
        at: new Date(),
      });
    });

    return prisma.paymentAttempt.findUniqueOrThrow({
      where: { id: attemptId },
      include: { payment: true, order: true },
    });
  }

  if (transactionReference) {
    return reconcilePaymentByTransactionReference({
      attemptId,
      userId,
      transactionReference,
      mockOutcome: input.mockOutcome,
    });
  }

  return verifyPayment({
    attemptId,
    userId,
    mockOutcome: input.mockOutcome,
  });
}

function extractTransactionReference(payload: Prisma.JsonValue | null): string | undefined {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return undefined;
  }

  const value = (payload as Record<string, unknown>).transactionReference;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function normalizeTransactionReference(value: string) {
  return value.trim().toLowerCase();
}

function resolveCanonicalTransactionReference(input: {
  transactionReference: string | null;
  requestPayload: Prisma.JsonValue | null;
}): string | undefined {
  if (input.transactionReference && input.transactionReference.trim().length > 0) {
    return normalizeTransactionReference(input.transactionReference);
  }

  const legacyReference = extractTransactionReference(input.requestPayload);
  return legacyReference ? normalizeTransactionReference(legacyReference) : undefined;
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

async function findAttemptsByTransactionReference(input: {
  transactionReferenceCanonical: string;
  excludeAttemptId?: string;
}) {
  const excludeSql = input.excludeAttemptId ? Prisma.sql`AND "id" <> ${input.excludeAttemptId}` : Prisma.empty;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "PaymentAttempt"
    WHERE "transactionReference" = ${input.transactionReferenceCanonical}
      OR (
        "transactionReference" IS NULL
        AND lower(coalesce("requestPayload"->>'transactionReference', '')) = ${input.transactionReferenceCanonical}
      )
      ${excludeSql}
    ORDER BY "createdAt" DESC
  `);

  if (rows.length === 0) {
    return [];
  }

  return prisma.paymentAttempt.findMany({
    where: { id: { in: rows.map((row) => row.id) } },
    include: {
      payment: true,
      order: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

type TransactionReferenceDecision =
  | { decision: "allow" }
  | { decision: "reject_paid_elsewhere" }
  | { decision: "reject_currently_verifying" }
  | { decision: "reuse_recoverable_attempt"; recoverableAttemptId: string };

function classifyTransactionReferenceUsage(input: {
  currentAttempt: { id: string; userId: string; orderId: string };
  relatedAttempts: Array<Pick<AttemptWithRelations, "id" | "status" | "userId" | "orderId">>;
}): TransactionReferenceDecision {
  for (const attempt of input.relatedAttempts) {
    if (attempt.status === "PAID" && attempt.orderId !== input.currentAttempt.orderId) {
      return { decision: "reject_paid_elsewhere" };
    }
  }

  for (const attempt of input.relatedAttempts) {
    const sameLogicalFlow = attempt.userId === input.currentAttempt.userId && attempt.orderId === input.currentAttempt.orderId;
    if (attempt.status === "VERIFYING" && !sameLogicalFlow) {
      return { decision: "reject_currently_verifying" };
    }
  }

  const recoverableAttempt = input.relatedAttempts.find((attempt) => {
    const sameLogicalFlow = attempt.userId === input.currentAttempt.userId && attempt.orderId === input.currentAttempt.orderId;
    return sameLogicalFlow && attempt.status !== "PAID";
  });

  if (recoverableAttempt) {
    return { decision: "reuse_recoverable_attempt", recoverableAttemptId: recoverableAttempt.id };
  }

  return { decision: "allow" };
}

function pickReconciliationCandidate(input: {
  attempts: AttemptWithRelations[];
  userId: string;
  preferredAttemptId?: string;
}) {
  if (input.preferredAttemptId) {
    const preferred = input.attempts.find(
      (attempt) => attempt.id === input.preferredAttemptId && attempt.userId === input.userId,
    );
    if (preferred) {
      return preferred;
    }
  }

  return input.attempts.find((attempt) => attempt.userId === input.userId && attempt.status !== "PAID");
}

export const __paymentServiceInternals = {
  classifyTransactionReferenceUsage,
  pickReconciliationCandidate,
  isTransactionNotFoundInSelectedProvider,
  buildFinalFailureReason,
  normalizeTransactionReference,
  resolveCanonicalTransactionReference,
};

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
