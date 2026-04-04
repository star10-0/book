-- CreateEnum
CREATE TYPE "AdminScope" AS ENUM ('SUPER_ADMIN', 'PAYMENT_ADMIN', 'SUPPORT_ADMIN', 'CONTENT_ADMIN');

-- AlterEnum
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'REPORT_EXPORTED';

-- AlterTable
ALTER TABLE "User"
ADD COLUMN "adminScopes" "AdminScope"[] DEFAULT ARRAY[]::"AdminScope"[];
