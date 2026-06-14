-- Track maintenance task source and retry lineage for the admin content maintenance menu.

ALTER TABLE "MaintenanceJob"
    ADD COLUMN IF NOT EXISTS "triggerSource" TEXT NOT NULL DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS "sourceJobId" TEXT,
    ADD COLUMN IF NOT EXISTS "retryCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "MaintenanceJob_triggerSource_idx" ON "MaintenanceJob"("triggerSource");
CREATE INDEX IF NOT EXISTS "MaintenanceJob_sourceJobId_idx" ON "MaintenanceJob"("sourceJobId");
