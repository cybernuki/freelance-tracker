/*
  Warnings:

  - You are about to drop the column `type` on the `milestones` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "milestones" DROP COLUMN "type";

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "saved_estimated_price" DOUBLE PRECISION,
ADD COLUMN     "saved_estimated_total" DOUBLE PRECISION;
