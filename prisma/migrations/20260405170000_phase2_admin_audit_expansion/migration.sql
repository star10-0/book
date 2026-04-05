-- Add additional admin audit actions for phase 2 operational coverage
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'PROMO_CODE_MUTATION';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'BOOK_MUTATION';
ALTER TYPE "AdminAuditAction" ADD VALUE IF NOT EXISTS 'CURRICULUM_MUTATION';
