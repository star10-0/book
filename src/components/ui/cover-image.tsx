"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useMemo, useState } from "react";
import { DEFAULT_IMAGE_FALLBACK_SRC, withImageFallback } from "@/lib/presentation/image-fallback";

type CoverImageProps = Omit<ImageProps, "src" | "alt"> & {
  src: string | null | undefined;
  alt: string;
};

export function CoverImage({ src, alt, onError, ...props }: CoverImageProps) {
  const normalizedSrc = useMemo(() => withImageFallback(src), [src]);
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [normalizedSrc]);

  return (
    <Image
      {...props}
      src={hasImageError ? DEFAULT_IMAGE_FALLBACK_SRC : normalizedSrc}
      alt={alt}
      onError={(event) => {
        setHasImageError(true);
        onError?.(event);
      }}
    />
  );
}
