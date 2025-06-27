-- CreateTable
CREATE TABLE "WorkCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "colorBg" TEXT NOT NULL,
    "colorText" TEXT NOT NULL,
    "colorBorder" TEXT NOT NULL,
    "colorAccent" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "WorkCategory_categoryId_key" ON "WorkCategory"("categoryId");
