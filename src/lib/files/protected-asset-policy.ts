import { ContentAccessPolicy } from "@prisma/client";

export type AssetDisposition = "inline" | "attachment";

export function canReadPubliclyByPolicy(policy: ContentAccessPolicy) {
  return policy === ContentAccessPolicy.PUBLIC_READ || policy === ContentAccessPolicy.PUBLIC_DOWNLOAD;
}

export function canDownloadByPolicy(policy: ContentAccessPolicy) {
  return policy === ContentAccessPolicy.PUBLIC_DOWNLOAD;
}

export function resolveAssetDisposition(requestedDownload: boolean): AssetDisposition {
  return requestedDownload ? "attachment" : "inline";
}

export function canAccessProtectedAsset(input: {
  policy: ContentAccessPolicy;
  hasActiveGrant: boolean;
  requestedDisposition: AssetDisposition;
}) {
  const canRead = canReadPubliclyByPolicy(input.policy) || input.hasActiveGrant;

  if (!canRead) {
    return { allowed: false as const, reason: "UNAUTHORIZED" as const };
  }

  if (input.requestedDisposition === "attachment") {
    const canDownload = canDownloadByPolicy(input.policy);

    if (!canDownload) {
      return { allowed: false as const, reason: "DOWNLOAD_NOT_ALLOWED" as const };
    }
  }

  return {
    allowed: true as const,
    disposition: input.requestedDisposition,
  };
}
