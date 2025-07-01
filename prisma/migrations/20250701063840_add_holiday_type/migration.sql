/*
  Warnings:

  - Added the required column `type` to the `Holiday` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Holiday" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "isHoliday" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Holiday" ("createdAt", "date", "description", "id", "isHoliday", "name", "updatedAt") SELECT "createdAt", "date", "description", "id", "isHoliday", "name", "updatedAt" FROM "Holiday";
DROP TABLE "Holiday";
ALTER TABLE "new_Holiday" RENAME TO "Holiday";
CREATE UNIQUE INDEX "Holiday_date_key" ON "Holiday"("date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
