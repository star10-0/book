import { FileKind, StorageProvider } from "@prisma/client";
import {
  BookAssetPointer,
  StorageProviderAdapter,
  createStorageProvider,
  type StoredUpload,
} from "@/lib/files/storage-provider";

export type AssetVisibility = "public" | "protected";

export function getAssetVisibility(kind: FileKind): AssetVisibility {
  return kind === FileKind.COVER_IMAGE ? "public" : "protected";
}

export function mapStorageProviderKeyToEnum(providerKey: string): StorageProvider {
  if (providerKey === "s3") {
    return StorageProvider.S3;
  }

  if (providerKey === "r2") {
    return StorageProvider.CLOUDFLARE_R2;
  }

  return StorageProvider.LOCAL;
}

export type UploadBookAssetInput = {
  bookId: string;
  kind: FileKind;
  bytes: Uint8Array;
  fileName: string;
  fileSizeBytes: number;
  mimeType: string;
};

export class BookStorageService {
  constructor(private readonly provider: StorageProviderAdapter = createStorageProvider()) {}

  get providerKey() {
    return this.provider.key;
  }

  async uploadBookAsset(input: UploadBookAssetInput): Promise<StoredUpload> {
    return this.provider.uploadFile({
      bytes: input.bytes,
      folder: `books/${input.bookId}/${input.kind.toLowerCase()}`,
      fileName: input.fileName,
      fileSizeBytes: input.fileSizeBytes,
      mimeType: input.mimeType,
      visibility: getAssetVisibility(input.kind) === "public" ? "public" : "private",
    });
  }

  async deleteBookAsset(pointer: BookAssetPointer): Promise<void> {
    await this.provider.deleteFile(pointer);
  }
}
