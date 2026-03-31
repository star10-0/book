export const DEFAULT_IMAGE_FALLBACK_SRC = "/1/1.png";

export function withImageFallback(src: string | null | undefined): string {
  if (!src) {
    return DEFAULT_IMAGE_FALLBACK_SRC;
  }

  const normalizedSrc = src.trim();
  return normalizedSrc.length > 0 ? normalizedSrc : DEFAULT_IMAGE_FALLBACK_SRC;
}
