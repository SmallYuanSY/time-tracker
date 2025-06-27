/*
  Warnings:

  - You are about to drop the column `estimatedHours` on the `ScheduledWork` table. All the data in the column will be lost.
  - You are about to drop the column `scheduledDate` on the `ScheduledWork` table. All the data in the column will be lost.
  - Added the required column `scheduledEndDate` to the `ScheduledWork` table without a default value. This is not possible if the table is not empty.
  - Added the required column `scheduledStartDate` to the `ScheduledWork` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ScheduledWork" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "projectCode" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "scheduledStartDate" DATETIME NOT NULL,
    "scheduledEndDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ScheduledWork_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ScheduledWork_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ScheduledWork" ("category", "content", "createdAt", "id", "isCompleted", "priority", "projectCode", "projectId", "projectName", "updatedAt", "userId") SELECT "category", "content", "createdAt", "id", "isCompleted", "priority", "projectCode", "projectId", "projectName", "updatedAt", "userId" FROM "ScheduledWork";
DROP TABLE "ScheduledWork";
ALTER TABLE "new_ScheduledWork" RENAME TO "ScheduledWork";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
