function containsUnsafeCharacters(value: string) {
  return /[\u0000-\u001F\u007F\\]/.test(value);
}

export function resolveSafeRelativeRedirect(input: { redirectParam: string | null | undefined; requestUrl: string; fallbackPath?: string }) {
  const fallbackPath = input.fallbackPath ?? "/";
  const redirectParam = input.redirectParam?.trim();

  if (!redirectParam || containsUnsafeCharacters(redirectParam)) {
    return fallbackPath;
  }

  try {
    const request = new URL(input.requestUrl);
    const candidate = new URL(redirectParam, request);

    if (candidate.origin !== request.origin) {
      return fallbackPath;
    }

    if (!candidate.pathname.startsWith("/") || containsUnsafeCharacters(candidate.pathname)) {
      return fallbackPath;
    }

    return `${candidate.pathname}${candidate.search}${candidate.hash}`;
  } catch {
    return fallbackPath;
  }
}
