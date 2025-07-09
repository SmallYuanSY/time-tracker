-- CreateTable
CREATE TABLE "WorkTimeSettings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "normalWorkStart" TEXT NOT NULL DEFAULT '09:00',
    "normalWorkEnd" TEXT NOT NULL DEFAULT '18:00',
    "lunchBreakStart" TEXT NOT NULL DEFAULT '12:30',
    "lunchBreakEnd" TEXT NOT NULL DEFAULT '13:30',
    "overtimeStart" TEXT NOT NULL DEFAULT '18:00',
    "minimumOvertimeUnit" INTEGER NOT NULL DEFAULT 30,
    "updatedAt" DATETIME NOT NULL
);
