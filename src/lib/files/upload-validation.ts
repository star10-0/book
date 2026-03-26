import path from "node:path";
import { FileKind } from "@prisma/client";
import { BOOK_ASSET_EXTENSIONS, BOOK_ASSET_MIME_TYPES } from "@/lib/files/book-asset-metadata";

const MAX_UPLOAD_SIZE_BYTES: Record<FileKind, number> = {
  [FileKind.COVER_IMAGE]: 5 * 1024 * 1024,
  [FileKind.EPUB]: 25 * 1024 * 1024,
  [FileKind.PDF]: 50 * 1024 * 1024,
  [FileKind.AUDIO]: 50 * 1024 * 1024,
  [FileKind.SAMPLE]: 5 * 1024 * 1024,
};

type DetectedMime = "application/pdf" | "application/epub+zip" | "image/jpeg" | "image/png" | "image/webp" | "unknown";

export type UploadValidationErrorCode =
  | "EMPTY_OR_OVERSIZE"
  | "UNSUPPORTED_EXTENSION_OR_MIME"
  | "MIME_SIGNATURE_MISMATCH"
  | "INVALID_SIGNATURE";

function matchesPdfSignature(bytes: Uint8Array) {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
}

function matchesZipSignature(bytes: Uint8Array) {
  if (bytes.length < 4) {
    return false;
  }

  return bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07) && (bytes[3] === 0x04 || bytes[3] === 0x06 || bytes[3] === 0x08);
}

function containsAscii(bytes: Uint8Array, text: string) {
  const encoded = new TextEncoder().encode(text);

  if (encoded.length === 0 || bytes.length < encoded.length) {
    return false;
  }

  for (let i = 0; i <= bytes.length - encoded.length; i += 1) {
    let match = true;

    for (let j = 0; j < encoded.length; j += 1) {
      if (bytes[i + j] !== encoded[j]) {
        match = false;
        break;
      }
    }

    if (match) {
      return true;
    }
  }

  return false;
}

function matchesEpubSignature(bytes: Uint8Array) {
  if (!matchesZipSignature(bytes)) {
    return false;
  }

  const probeLength = Math.min(bytes.length, 4096);
  const probeSlice = bytes.slice(0, probeLength);
  return containsAscii(probeSlice, "application/epub+zip");
}

function matchesJpegSignature(bytes: Uint8Array) {
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

function matchesPngSignature(bytes: Uint8Array) {
  return bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
}

function matchesWebpSignature(bytes: Uint8Array) {
  return bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
}

export function detectMimeBySignature(bytes: Uint8Array): DetectedMime {
  if (matchesPdfSignature(bytes)) {
    return "application/pdf";
  }

  if (matchesEpubSignature(bytes)) {
    return "application/epub+zip";
  }

  if (matchesJpegSignature(bytes)) {
    return "image/jpeg";
  }

  if (matchesPngSignature(bytes)) {
    return "image/png";
  }

  if (matchesWebpSignature(bytes)) {
    return "image/webp";
  }

  return "unknown";
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
    return extension === ".pdf" && matchesPdfSignature(bytes);
  }

  if (kind === FileKind.EPUB) {
    return extension === ".epub" && matchesEpubSignature(bytes);
  }

  if (kind === FileKind.COVER_IMAGE) {
    if (extension === ".jpg" || extension === ".jpeg") {
      return matchesJpegSignature(bytes);
    }

    if (extension === ".png") {
      return matchesPngSignature(bytes);
    }

    if (extension === ".webp") {
      return matchesWebpSignature(bytes);
    }

    return false;
  }

  return true;
}

export function validateUploadPayload(input: { kind: FileKind; fileName: string; mimeType: string; sizeBytes: number; bytes: Uint8Array }) {
  const sizeValidation = validateUploadSize(input.kind, input.sizeBytes);

  if (!sizeValidation.ok) {
    return { ok: false as const, code: "EMPTY_OR_OVERSIZE" as const, maxBytes: sizeValidation.maxBytes };
  }

  const kindKey = input.kind as keyof typeof BOOK_ASSET_MIME_TYPES;
  const allowedMimes = BOOK_ASSET_MIME_TYPES[kindKey] ?? [];
  const allowedExtensions = BOOK_ASSET_EXTENSIONS[kindKey] ?? [];
  const extension = path.extname(input.fileName).toLowerCase();

  if (!allowedMimes.includes(input.mimeType) || !allowedExtensions.includes(extension)) {
    return { ok: false as const, code: "UNSUPPORTED_EXTENSION_OR_MIME" as const, maxBytes: sizeValidation.maxBytes };
  }

  if (!validateFileSignature(input.kind, input.fileName, input.bytes)) {
    return { ok: false as const, code: "INVALID_SIGNATURE" as const, maxBytes: sizeValidation.maxBytes };
  }

  const detected = detectMimeBySignature(input.bytes);

  if (detected === "unknown" || !allowedMimes.includes(detected)) {
    return { ok: false as const, code: "MIME_SIGNATURE_MISMATCH" as const, maxBytes: sizeValidation.maxBytes };
  }

  return { ok: true as const, maxBytes: sizeValidation.maxBytes };
}

export function getUploadValidationArabicMessage(errorCode: UploadValidationErrorCode, maxBytes: number) {
  if (errorCode === "EMPTY_OR_OVERSIZE") {
    return `حجم الملف غير صالح أو يتجاوز الحد المسموح (${Math.floor(maxBytes / (1024 * 1024))}MB).`;
  }

  if (errorCode === "UNSUPPORTED_EXTENSION_OR_MIME") {
    return "صيغة الملف أو نوع MIME غير مدعوم لهذا النوع.";
  }

  if (errorCode === "MIME_SIGNATURE_MISMATCH") {
    return "نوع الملف الفعلي لا يطابق النوع المصرّح به. يرجى رفع ملف صالح.";
  }

  return "بصمة الملف لا تطابق نوعه المعلن.";
}
