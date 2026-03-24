import { ContentAccessPolicy, FileKind } from "@prisma/client";

type ReaderAsset = {
  kind: FileKind;
  publicUrl: string | null;
};

type BookContentInputs = {
  policy: ContentAccessPolicy;
  textContent: string | null;
  files: ReaderAsset[];
};

export function getReadableFile(files: ReaderAsset[]) {
  return files.find((file) => (file.kind === FileKind.PDF || file.kind === FileKind.EPUB) && Boolean(file.publicUrl)) ?? null;
}

export function resolveBookContentAccess(input: BookContentInputs) {
  const textContent = input.textContent?.trim() ?? "";
  const readableFile = getReadableFile(input.files);

  const hasReadableContent = Boolean(textContent) || Boolean(readableFile);
  const hasDownloadableFile = Boolean(readableFile?.publicUrl);

  const canReadPublicly =
    (input.policy === ContentAccessPolicy.PUBLIC_READ || input.policy === ContentAccessPolicy.PUBLIC_DOWNLOAD) &&
    hasReadableContent;

  const canDownloadPublicly = input.policy === ContentAccessPolicy.PUBLIC_DOWNLOAD && hasDownloadableFile;

  const canReadPreview = input.policy === ContentAccessPolicy.PREVIEW_ONLY && textContent.length > 0;

  return {
    hasReadableContent,
    hasDownloadableFile,
    canReadPublicly,
    canDownloadPublicly,
    canReadPreview,
    readableFile,
    textContent,
    isPreviewOnly: input.policy === ContentAccessPolicy.PREVIEW_ONLY,
  };
}
