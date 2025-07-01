-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_workLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME,
    "projectCode" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isOvertime" BOOLEAN NOT NULL DEFAULT false,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editReason" TEXT,
    "editedBy" TEXT,
    "editedAt" DATETIME,
    "editIpAddress" TEXT,
    "originalStartTime" DATETIME,
    "originalEndTime" DATETIME,
    CONSTRAINT "workLog_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "workLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_workLog" ("category", "content", "editIpAddress", "editReason", "editedAt", "editedBy", "endTime", "id", "isEdited", "originalEndTime", "originalStartTime", "projectCode", "projectId", "projectName", "startTime", "userId") SELECT "category", "content", "editIpAddress", "editReason", "editedAt", "editedBy", "endTime", "id", "isEdited", "originalEndTime", "originalStartTime", "projectCode", "projectId", "projectName", "startTime", "userId" FROM "workLog";
DROP TABLE "workLog";
ALTER TABLE "new_workLog" RENAME TO "workLog";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
