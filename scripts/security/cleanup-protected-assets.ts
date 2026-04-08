import { prisma } from "@/lib/prisma";
import { cleanupProtectedAssetArtifacts } from "@/lib/security/protected-asset-cleanup";

async function main() {
  const result = await cleanupProtectedAssetArtifacts(prisma);

  console.info("[security:cleanup:protected-assets] completed", result);
}

main()
  .catch((error) => {
    console.error("[security:cleanup:protected-assets] failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
