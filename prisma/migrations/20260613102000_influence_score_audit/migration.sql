CREATE TABLE "InfluenceScoreAuditLog" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "scoreVersion" TEXT NOT NULL,
    "previousScore" DOUBLE PRECISION NOT NULL,
    "computedScore" DOUBLE PRECISION NOT NULL,
    "appliedScore" DOUBLE PRECISION,
    "dimensions" JSONB NOT NULL,
    "signals" JSONB NOT NULL,
    "weights" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'dry_run',
    "reason" TEXT,
    "reviewer" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InfluenceScoreAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InfluenceScoreAuditLog_personId_idx" ON "InfluenceScoreAuditLog"("personId");
CREATE INDEX "InfluenceScoreAuditLog_scoreVersion_idx" ON "InfluenceScoreAuditLog"("scoreVersion");
CREATE INDEX "InfluenceScoreAuditLog_status_idx" ON "InfluenceScoreAuditLog"("status");
CREATE INDEX "InfluenceScoreAuditLog_createdAt_idx" ON "InfluenceScoreAuditLog"("createdAt");

ALTER TABLE "InfluenceScoreAuditLog"
ADD CONSTRAINT "InfluenceScoreAuditLog_personId_fkey"
FOREIGN KEY ("personId") REFERENCES "People"("id") ON DELETE CASCADE ON UPDATE CASCADE;
