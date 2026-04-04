export type RiskSeverity = "info" | "warning" | "critical";

export type RiskSignalCode =
  | "NEW_DEVICE_PROTECTED_ACCOUNT"
  | "REPEATED_BLOCKED_DEVICE_LOGINS"
  | "SUSPICIOUS_MULTI_DEVICE_PATTERN"
  | "REPEATED_PAYMENT_VERIFICATION_FAILURES"
  | "TX_CONFLICT_OR_ABNORMAL_MANUAL_PAYMENT";

export type RiskSignal = {
  code: RiskSignalCode;
  severity: RiskSeverity;
  title: string;
  details: string;
  recommendedAction: string;
  occurredAt: Date;
};

export type RiskSignalInput = {
  newDeviceAttemptsOnProtectedAccounts: number;
  repeatedBlockedDeviceLogins: number;
  suspiciousMultiDevicePatterns: number;
  repeatedPaymentVerificationFailures: number;
  txConflictsOrAbnormalManualPaymentBehavior: number;
};

const signalCatalog: Record<RiskSignalCode, Omit<RiskSignal, "occurredAt">> = {
  NEW_DEVICE_PROTECTED_ACCOUNT: {
    code: "NEW_DEVICE_PROTECTED_ACCOUNT",
    severity: "warning",
    title: "محاولة جهاز جديد لحساب محمي",
    details: "تم رصد محاولات أجهزة جديدة على حسابات محمية خلال نافذة المراقبة.",
    recommendedAction: "تحقق من مالك الحساب وراجع عناوين IP قبل السماح بتسجيل الجهاز.",
  },
  REPEATED_BLOCKED_DEVICE_LOGINS: {
    code: "REPEATED_BLOCKED_DEVICE_LOGINS",
    severity: "critical",
    title: "تكرار محاولات تسجيل دخول محجوبة",
    details: "ارتفاع محاولات تسجيل دخول محجوبة لنفس الحساب أو نفس الجهاز.",
    recommendedAction: "جمّد الجلسات وفعّل إعادة ضبط كلمة المرور إذا استمر النمط.",
  },
  SUSPICIOUS_MULTI_DEVICE_PATTERN: {
    code: "SUSPICIOUS_MULTI_DEVICE_PATTERN",
    severity: "warning",
    title: "نمط تعدد أجهزة مشبوه",
    details: "نشاط وصول/تسجيل دخول من أجهزة أو IP متعددة بسرعة غير طبيعية.",
    recommendedAction: "راجع آخر الأجهزة الموثوقة وأوقف الأجهزة غير المعروفة.",
  },
  REPEATED_PAYMENT_VERIFICATION_FAILURES: {
    code: "REPEATED_PAYMENT_VERIFICATION_FAILURES",
    severity: "warning",
    title: "فشل متكرر في تحقق الدفع",
    details: "محاولات دفع متعددة فشلت خلال فترة قصيرة لنفس المستخدم.",
    recommendedAction: "ضع الحساب في قائمة مراجعة الدفع واطلب إثبات تحويل واضح.",
  },
  TX_CONFLICT_OR_ABNORMAL_MANUAL_PAYMENT: {
    code: "TX_CONFLICT_OR_ABNORMAL_MANUAL_PAYMENT",
    severity: "critical",
    title: "تضارب مرجع دفع/سلوك يدوي غير طبيعي",
    details: "تم اكتشاف تضارب مرجع عملية أو تدخل يدوي متكرر على نفس المحاولة.",
    recommendedAction: "علّق منح الوصول حتى يتم التحقق اليدوي من المرجع ومصدر الدفعة.",
  },
};

export function buildRiskSignals(input: RiskSignalInput, now = new Date()): RiskSignal[] {
  const signals: RiskSignal[] = [];

  if (input.newDeviceAttemptsOnProtectedAccounts > 0) {
    signals.push(withTimestamp(signalCatalog.NEW_DEVICE_PROTECTED_ACCOUNT, now));
  }

  if (input.repeatedBlockedDeviceLogins > 0) {
    signals.push(withTimestamp(signalCatalog.REPEATED_BLOCKED_DEVICE_LOGINS, now));
  }

  if (input.suspiciousMultiDevicePatterns > 0) {
    signals.push(withTimestamp(signalCatalog.SUSPICIOUS_MULTI_DEVICE_PATTERN, now));
  }

  if (input.repeatedPaymentVerificationFailures > 0) {
    signals.push(withTimestamp(signalCatalog.REPEATED_PAYMENT_VERIFICATION_FAILURES, now));
  }

  if (input.txConflictsOrAbnormalManualPaymentBehavior > 0) {
    signals.push(withTimestamp(signalCatalog.TX_CONFLICT_OR_ABNORMAL_MANUAL_PAYMENT, now));
  }

  return signals;
}

function withTimestamp(signal: Omit<RiskSignal, "occurredAt">, occurredAt: Date): RiskSignal {
  return {
    ...signal,
    occurredAt,
  };
}

export function summarizeRiskSeverity(signals: RiskSignal[]) {
  return {
    info: signals.filter((signal) => signal.severity === "info").length,
    warning: signals.filter((signal) => signal.severity === "warning").length,
    critical: signals.filter((signal) => signal.severity === "critical").length,
  };
}
