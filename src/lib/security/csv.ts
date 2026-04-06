const FORMULA_PREFIX_PATTERN = /^[=+\-@]/;

export function sanitizeCsvCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const normalized = String(value).replace(/\r?\n/g, " ");

  if (FORMULA_PREFIX_PATTERN.test(normalized)) {
    return `'${normalized}`;
  }

  return normalized;
}

export function escapeCsvCell(value: unknown) {
  const sanitized = sanitizeCsvCell(value);

  if (!/[",]/.test(sanitized)) {
    return sanitized;
  }

  return `"${sanitized.replace(/"/g, '""')}"`;
}
