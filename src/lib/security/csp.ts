export function buildContentSecurityPolicy({
  isDevelopment,
  nonce,
}: {
  isDevelopment: boolean;
  nonce?: string;
}) {
  const scriptSrc = ["'self'"];
  const connectSrc = ["'self'"];

  if (isDevelopment) {
    scriptSrc.push("'unsafe-inline'", "'unsafe-eval'");
    connectSrc.push("ws:", "http:", "https:");
  } else if (nonce) {
    scriptSrc.push(`'nonce-${nonce}'`);
  }

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https://placehold.co https://api.qrserver.com",
    "font-src 'self' data:",
    `connect-src ${connectSrc.join(" ")}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
}

export const uploadFrameContentSecurityPolicy = "frame-ancestors 'self'";
