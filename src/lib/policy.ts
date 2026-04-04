export const DEVICE_POLICY_TERMS_VERSION = "2026-04";

export const DEVICE_POLICY_NOTICE_AR =
  "هذا الحساب مخصص للاستخدام الشخصي على جهاز موثوق واحد فقط. إن تسجيل الدخول من جهاز آخر أو مشاركة الحساب مع الغير قد يؤدي إلى تعليق الوصول أو حظر الحساب بعد التحقق والمراجعة.";

export function buildPolicyAcceptanceUpdate(now = new Date()) {
  return {
    acceptedTermsVersion: DEVICE_POLICY_TERMS_VERSION,
    acceptedDevicePolicyAt: now,
  };
}

export function hasAcceptedCurrentDevicePolicy(acceptedTermsVersion?: string | null) {
  return acceptedTermsVersion === DEVICE_POLICY_TERMS_VERSION;
}
