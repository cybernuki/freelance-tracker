-- CreateTable
CREATE TABLE "quote_issue_estimations" (
    "id" TEXT NOT NULL,
    "github_issue_id" INTEGER NOT NULL,
    "issue_number" INTEGER NOT NULL,
    "issue_title" TEXT NOT NULL,
    "issue_type" "IssueType" NOT NULL,
    "estimated_messages" INTEGER,
    "fixed_price" DOUBLE PRECISION,
    "calculated_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "milestone_estimation_id" TEXT NOT NULL,

    CONSTRAINT "quote_issue_estimations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quote_issue_estimations_milestone_estimation_id_github_issu_key" ON "quote_issue_estimations"("milestone_estimation_id", "github_issue_id");

-- AddForeignKey
ALTER TABLE "quote_issue_estimations" ADD CONSTRAINT "quote_issue_estimations_milestone_estimation_id_fkey" FOREIGN KEY ("milestone_estimation_id") REFERENCES "quote_milestone_estimations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
