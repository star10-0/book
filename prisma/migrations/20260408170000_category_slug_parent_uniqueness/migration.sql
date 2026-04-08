-- Drop old global uniqueness
DROP INDEX IF EXISTS "Category_slug_key";

-- Enforce uniqueness among siblings with same parent
CREATE UNIQUE INDEX "Category_parentId_slug_key" ON "Category"("parentId", "slug");

-- Enforce uniqueness among root-level siblings (parentId IS NULL)
CREATE UNIQUE INDEX "Category_root_slug_key" ON "Category"("slug") WHERE "parentId" IS NULL;
