const LOCATOR_PAGE_PREFIX = "page:";

export function normalizeProgress(value: number) {
  if (Number.isNaN(value)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(value * 100) / 100));
}

export function parsePdfPageFromLocator(locator: string | null | undefined) {
  if (!locator || !locator.startsWith(LOCATOR_PAGE_PREFIX)) {
    return 1;
  }

  const pageValue = Number(locator.replace(LOCATOR_PAGE_PREFIX, ""));

  if (Number.isNaN(pageValue) || pageValue < 1) {
    return 1;
  }

  return Math.floor(pageValue);
}

export function toPdfLocator(page: number) {
  const safePage = Math.max(1, Math.floor(page));
  return `${LOCATOR_PAGE_PREFIX}${safePage}`;
}
