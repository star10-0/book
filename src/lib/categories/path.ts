export function buildCatalogPath(slugs: string[]) {
  const normalized = slugs.map((slug) => slug.trim()).filter(Boolean);

  if (normalized.length === 0) {
    return "/catalog";
  }

  return `/catalog/${normalized.join("/")}`;
}

export function buildCatalogBreadcrumbHref(slugs: string[], index: number) {
  return buildCatalogPath(slugs.slice(0, index + 1));
}

export function isValidCatalogPathSlugs(slugs: string[], pattern: RegExp, maxDepth = 12) {
  if (slugs.length === 0 || slugs.length > maxDepth) {
    return false;
  }

  return slugs.every((slug) => pattern.test(slug));
}
