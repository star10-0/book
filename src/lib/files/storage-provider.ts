export const STORAGE_PROVIDER_KEYS = ["local", "s3", "r2"] as const;

export type StorageProviderKey = (typeof STORAGE_PROVIDER_KEYS)[number];

export type BookAssetPointer = {
  key: string;
  bucket?: string;
  region?: string;
  publicUrl?: string;
};

export type StorageUploadRequest = {
  mimeType: string;
  fileName: string;
  fileSizeBytes: number;
};

export type StorageUploadTarget = {
  method: "PUT" | "POST";
  uploadUrl: string;
  headers?: Record<string, string>;
  fields?: Record<string, string>;
  assetPointer: BookAssetPointer;
};

export interface StorageProviderAdapter {
  readonly key: StorageProviderKey;
  createUploadTarget(input: StorageUploadRequest): Promise<StorageUploadTarget>;
  resolvePublicUrl(pointer: BookAssetPointer): string | null;
}

export const resolveStorageProviderFromEnv = (): StorageProviderKey => {
  const configuredProvider = process.env.BOOK_STORAGE_PROVIDER?.toLowerCase();

  if (configuredProvider === "s3" || configuredProvider === "r2") {
    return configuredProvider;
  }

  return "local";
};
