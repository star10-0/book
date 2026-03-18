-- Rename customer role to user for unified role naming.
ALTER TYPE "UserRole" RENAME VALUE 'CUSTOMER' TO 'USER';

-- Credentials authentication support.
ALTER TABLE "User"
ADD COLUMN "passwordHash" TEXT;
