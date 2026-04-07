export function buildPaymentClientConfigError(input: { code: string; message: string }) {
  return {
    message: input.message,
    error: {
      code: input.code,
    },
  };
}
