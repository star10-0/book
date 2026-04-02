const LOCATOR_PAGE_PREFIX = "page:";
const LOCATOR_EPUB_PREFIX = "epub:";

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

export function parseEpubSectionFromLocator(locator: string | null | undefined, totalSections: number) {
  if (totalSections <= 0) {
    return 1;
  }

  const rawValue = locator?.startsWith(LOCATOR_EPUB_PREFIX)
    ? locator.replace(LOCATOR_EPUB_PREFIX, "")
    : locator?.startsWith(LOCATOR_PAGE_PREFIX)
      ? locator.replace(LOCATOR_PAGE_PREFIX, "")
      : "1";

  const sectionValue = Number(rawValue);

  if (Number.isNaN(sectionValue) || sectionValue < 1) {
    return 1;
  }

  return Math.min(totalSections, Math.floor(sectionValue));
}

export function toEpubLocator(section: number) {
  const safeSection = Math.max(1, Math.floor(section));
  return `${LOCATOR_EPUB_PREFIX}${safeSection}`;
}
