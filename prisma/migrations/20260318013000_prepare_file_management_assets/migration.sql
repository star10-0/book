-- AlterEnum
ALTER TYPE "FileKind" ADD VALUE IF NOT EXISTS 'COVER_IMAGE';

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('LOCAL', 'S3', 'CLOUDFLARE_R2');

-- AlterTable
ALTER TABLE "BookFile"
ADD COLUMN "storageProvider" "StorageProvider" NOT NULL DEFAULT 'LOCAL',
ADD COLUMN "bucket" TEXT,
ADD COLUMN "region" TEXT,
ADD COLUMN "publicUrl" TEXT,
ADD COLUMN "originalFileName" TEXT,
ADD COLUMN "metadata" JSONB,
ADD COLUMN "coverWidth" INTEGER,
ADD COLUMN "coverHeight" INTEGER,
ADD COLUMN "coverBlurDataUrl" TEXT,
ADD COLUMN "epubVersion" TEXT,
ADD COLUMN "epubPackagePath" TEXT,
ADD COLUMN "pdfVersion" TEXT,
ADD COLUMN "pdfPageCount" INTEGER;
