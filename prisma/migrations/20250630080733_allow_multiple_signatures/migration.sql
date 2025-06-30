/*
  Warnings:

  - A unique constraint covering the columns `[userId,date,signedBy]` on the table `AttendanceSignature` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "AttendanceSignature_userId_date_key";

-- AlterTable
ALTER TABLE "AttendanceSignature" ADD COLUMN "note" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceSignature_userId_date_signedBy_key" ON "AttendanceSignature"("userId", "date", "signedBy");
