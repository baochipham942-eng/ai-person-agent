-- Add app-level cancellation metadata for admin content maintenance jobs.

ALTER TABLE "MaintenanceJob"
    ADD COLUMN IF NOT EXISTS "cancelRequestedAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "canceledById" TEXT,
    ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;

CREATE INDEX IF NOT EXISTS "MaintenanceJob_canceledById_idx" ON "MaintenanceJob"("canceledById");
CREATE INDEX IF NOT EXISTS "MaintenanceJob_cancelRequestedAt_idx" ON "MaintenanceJob"("cancelRequestedAt");
