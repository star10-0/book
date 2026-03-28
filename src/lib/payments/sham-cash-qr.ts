type BuildShamCashQrPayloadInput = {
  destinationAccount?: string;
  amountMajor: number;
  currency: "SYP" | "USD";
  orderReference: string;
};

type ShamCashQrPayload = {
  payload: string;
  format: "fallback-json-v1";
};

export function buildShamCashQrPayload(input: BuildShamCashQrPayloadInput): ShamCashQrPayload {
  const normalizedDestination = input.destinationAccount?.trim() ?? "";
  const normalizedAmount = Number(input.amountMajor.toFixed(2));
  const issuedAt = new Date().toISOString();

  return {
    format: "fallback-json-v1",
    payload: JSON.stringify({
      schema: "book.sham_cash.manual_transfer.v1",
      provider: "SHAM_CASH",
      destinationAccount: normalizedDestination,
      amount: normalizedAmount,
      currency: input.currency,
      orderReference: input.orderReference,
      issuedAt,
    }),
  };
}
