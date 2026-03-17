export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function toPositiveInt(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);

    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return fallback;
}
