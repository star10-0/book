import { FileKind } from "@prisma/client";

export type ReaderFileKind = Extract<FileKind, "EPUB" | "PDF">;

export type ReaderTheme = "light" | "dark";

export type ReaderLocation = {
  locator: string;
  progressPercent: number;
};

export type ReaderDocumentSource = {
  kind: ReaderFileKind;
  publicUrl: string | null;
  storageKey: string;
  isEncrypted: boolean;
  metadata: unknown;
};

export type ReaderProtectionHooks = {
  onWatermarkRender?: (payload: { locator: string }) => void;
  onDrmChallenge?: (payload: { reason: string }) => void;
};
