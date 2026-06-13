CREATE TABLE "CompareReport" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "topic" TEXT,
  "peopleIds" TEXT[],
  "status" TEXT NOT NULL DEFAULT 'pending',
  "visibility" TEXT NOT NULL DEFAULT 'public',
  "summary" TEXT,
  "reportJson" JSONB,
  "sourceSnapshot" JSONB,
  "errorMessage" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "completedAt" TIMESTAMP(3),

  CONSTRAINT "CompareReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CompareReportEvent" (
  "id" TEXT NOT NULL,
  "reportId" TEXT NOT NULL,
  "step" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'running',
  "title" TEXT NOT NULL,
  "message" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CompareReportEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CompareReport_createdById_idx" ON "CompareReport"("createdById");
CREATE INDEX "CompareReport_status_createdAt_idx" ON "CompareReport"("status", "createdAt");
CREATE INDEX "CompareReport_createdAt_idx" ON "CompareReport"("createdAt");
CREATE INDEX "CompareReportEvent_reportId_createdAt_idx" ON "CompareReportEvent"("reportId", "createdAt");
CREATE INDEX "CompareReportEvent_step_idx" ON "CompareReportEvent"("step");

ALTER TABLE "CompareReport"
  ADD CONSTRAINT "CompareReport_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CompareReportEvent"
  ADD CONSTRAINT "CompareReportEvent_reportId_fkey"
  FOREIGN KEY ("reportId") REFERENCES "CompareReport"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
