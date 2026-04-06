const FORMULA_PREFIX_PATTERN = /^[=+\-@]/;
const LEADING_CONTROL_OR_WHITESPACE_PATTERN = /^[\u0000-\u001f\s]+/;

export function sanitizeCsvCell(value: unknown) {
  if (value === null || value === undefined) {
    return "";
  }

  const normalized = String(value).replace(/\r?\n/g, " ");
  const formulaProbe = normalized.replace(LEADING_CONTROL_OR_WHITESPACE_PATTERN, "");

  if (FORMULA_PREFIX_PATTERN.test(formulaProbe)) {
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
