import path from "node:path";
import { FileKind } from "@prisma/client";

const MAX_UPLOAD_SIZE_BYTES: Record<FileKind, number> = {
  [FileKind.COVER_IMAGE]: 5 * 1024 * 1024,
  [FileKind.EPUB]: 25 * 1024 * 1024,
  [FileKind.PDF]: 50 * 1024 * 1024,
  [FileKind.AUDIO]: 50 * 1024 * 1024,
  [FileKind.SAMPLE]: 5 * 1024 * 1024,
};

function matchesPdfSignature(bytes: Uint8Array) {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
}

function matchesZipSignature(bytes: Uint8Array) {
  if (bytes.length < 4) {
    return false;
  }

  return bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07) && (bytes[3] === 0x04 || bytes[3] === 0x06 || bytes[3] === 0x08);
}

function matchesCoverSignature(bytes: Uint8Array, extension: string) {
  if (extension === ".jpg" || extension === ".jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (extension === ".png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  if (extension === ".webp") {
    return (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }

  return false;
}

export function validateUploadSize(kind: FileKind, sizeBytes: number) {
  const maxBytes = MAX_UPLOAD_SIZE_BYTES[kind];
  return {
    ok: sizeBytes > 0 && sizeBytes <= maxBytes,
    maxBytes,
  };
}

export function validateFileSignature(kind: FileKind, fileName: string, bytes: Uint8Array) {
  const extension = path.extname(fileName).toLowerCase();

  if (kind === FileKind.PDF) {
    return matchesPdfSignature(bytes);
  }

  if (kind === FileKind.EPUB) {
    return matchesZipSignature(bytes);
  }

  if (kind === FileKind.COVER_IMAGE) {
    return matchesCoverSignature(bytes, extension);
  }

  return true;
}

