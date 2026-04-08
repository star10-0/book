-- CreateTable
CREATE TABLE "ProtectedAssetHandoffTicket" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "disposition" TEXT NOT NULL,
    "userId" TEXT,
    "accessGrantId" TEXT,
    "readingSessionId" TEXT,
    "watermarkText" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "redeemedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProtectedAssetHandoffTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProtectedAssetSession" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "fileId" TEXT NOT NULL,
    "disposition" TEXT NOT NULL,
    "userId" TEXT,
    "accessGrantId" TEXT,
    "readingSessionId" TEXT,
    "watermarkText" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProtectedAssetSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProtectedAssetHandoffTicket_tokenHash_key" ON "ProtectedAssetHandoffTicket"("tokenHash");

-- CreateIndex
CREATE INDEX "ProtectedAssetHandoffTicket_fileId_expiresAt_idx" ON "ProtectedAssetHandoffTicket"("fileId", "expiresAt");

-- CreateIndex
CREATE INDEX "ProtectedAssetHandoffTicket_userId_expiresAt_idx" ON "ProtectedAssetHandoffTicket"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "ProtectedAssetHandoffTicket_expiresAt_redeemedAt_idx" ON "ProtectedAssetHandoffTicket"("expiresAt", "redeemedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ProtectedAssetSession_tokenHash_key" ON "ProtectedAssetSession"("tokenHash");

-- CreateIndex
CREATE INDEX "ProtectedAssetSession_fileId_expiresAt_idx" ON "ProtectedAssetSession"("fileId", "expiresAt");

-- CreateIndex
CREATE INDEX "ProtectedAssetSession_userId_expiresAt_idx" ON "ProtectedAssetSession"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "ProtectedAssetSession_expiresAt_idx" ON "ProtectedAssetSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "ProtectedAssetHandoffTicket" ADD CONSTRAINT "ProtectedAssetHandoffTicket_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "BookFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtectedAssetHandoffTicket" ADD CONSTRAINT "ProtectedAssetHandoffTicket_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtectedAssetSession" ADD CONSTRAINT "ProtectedAssetSession_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "BookFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProtectedAssetSession" ADD CONSTRAINT "ProtectedAssetSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
