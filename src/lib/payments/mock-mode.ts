const MOCK_VERIFY_FLAG = "ALLOW_MOCK_PAYMENT_VERIFICATION";

export function isMockPaymentVerificationEnabled() {
  const nodeEnv = process.env.NODE_ENV;
  const isDevelopmentLike = nodeEnv === "development" || nodeEnv === "test";
  const hasExplicitFlag = process.env[MOCK_VERIFY_FLAG]?.toLowerCase() === "true";

  return isDevelopmentLike && hasExplicitFlag;
}

