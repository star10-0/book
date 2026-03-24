-- Add creator role to user roles
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'CREATOR';

-- Expand book workflow statuses
ALTER TYPE "BookStatus" ADD VALUE IF NOT EXISTS 'PENDING_REVIEW';
ALTER TYPE "BookStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

-- Add creator ownership to books
ALTER TABLE "Book"
ADD COLUMN IF NOT EXISTS "creatorId" TEXT;

CREATE INDEX IF NOT EXISTS "Book_creatorId_idx" ON "Book"("creatorId");

ALTER TABLE "Book"
ADD CONSTRAINT "Book_creatorId_fkey"
FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Creator profile model
CREATE TABLE IF NOT EXISTS "CreatorProfile" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "bio" TEXT,
  "avatarUrl" TEXT,
  "coverUrl" TEXT,
  "authorId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CreatorProfile_userId_key" ON "CreatorProfile"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "CreatorProfile_slug_key" ON "CreatorProfile"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "CreatorProfile_authorId_key" ON "CreatorProfile"("authorId");

ALTER TABLE "CreatorProfile"
ADD CONSTRAINT "CreatorProfile_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreatorProfile"
ADD CONSTRAINT "CreatorProfile_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "Author"("id") ON DELETE SET NULL ON UPDATE CASCADE;
