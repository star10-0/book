import { jsonNoStore } from "@/lib/security";

export const API_ERROR_CODES = {
  invalid_request: "INVALID_REQUEST",
  unauthorized: "UNAUTHORIZED",
  forbidden: "FORBIDDEN",
  not_found: "NOT_FOUND",
  conflict: "CONFLICT",
  server_error: "SERVER_ERROR",
  bad_gateway: "BAD_GATEWAY",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export function buildErrorPayload(code: ApiErrorCode, message: string) {
  return {
    ok: false as const,
    message,
    error: {
      code,
      message,
    },
  };
}

export function jsonError(code: ApiErrorCode, message: string, status: number) {
  return jsonNoStore(buildErrorPayload(code, message), { status });
}

export async function parseJsonBody<T>(
  request: Request,
  options?: { invalidMessage?: string },
): Promise<{ data: T } | { error: Response }> {
  try {
    const data = (await request.json()) as T;
    return { data };
  } catch {
    const message = options?.invalidMessage ?? "تعذر قراءة بيانات الطلب.";
    return {
      error: jsonError(API_ERROR_CODES.invalid_request, message, 400),
    };
  }
}
