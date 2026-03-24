export type ServiceResult<TData, TError extends string> =
  | {
      ok: true;
      data: TData;
    }
  | {
      ok: false;
      error: TError;
    };

export function ok<TData>(data: TData): ServiceResult<TData, never> {
  return { ok: true, data };
}

export function err<TError extends string>(error: TError): ServiceResult<never, TError> {
  return { ok: false, error };
}
