const MOCK_VERIFY_FLAG = "ALLOW_MOCK_PAYMENT_VERIFICATION";
const MOCK_GATEWAY_FLAG = "ALLOW_MOCK_PAYMENTS";
const PAYMENT_MODE_ENV = "PAYMENT_GATEWAY_MODE";

function isMockGatewayMode() {
  const mode = process.env[PAYMENT_MODE_ENV]?.trim().toLowerCase();
  return !mode || mode === "mock";
}

export function isMockPaymentVerificationEnabled() {
  const nodeEnv = process.env.NODE_ENV;
  const isDevelopmentLike = nodeEnv === "development" || nodeEnv === "test";
  const hasExplicitFlag = process.env[MOCK_VERIFY_FLAG]?.toLowerCase() === "true";

  return isDevelopmentLike && isMockGatewayMode() && hasExplicitFlag;
}

export function isMockPaymentGatewayEnabled() {
  const nodeEnv = process.env.NODE_ENV;
  const isDevelopmentLike = nodeEnv === "development" || nodeEnv === "test";
  const hasExplicitFlag = process.env[MOCK_GATEWAY_FLAG]?.toLowerCase() === "true";

  return isDevelopmentLike && isMockGatewayMode() && hasExplicitFlag;
}
