import { GatewayRequestError } from "@/lib/payments/gateways/provider-http";

export function getVerifyGatewayErrorMessage(error: GatewayRequestError): string {
  if (process.env.NODE_ENV === "development") {
    return error.message;
  }

  return "تعذر التحقق من الدفع عبر مزود الخدمة حالياً.";
}

