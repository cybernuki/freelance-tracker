/*
  Warnings:

  - You are about to drop the column `milestone_type` on the `quote_milestone_estimations` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "quote_milestone_estimations" DROP COLUMN "milestone_type";

-- DropEnum
DROP TYPE "MilestoneType";
