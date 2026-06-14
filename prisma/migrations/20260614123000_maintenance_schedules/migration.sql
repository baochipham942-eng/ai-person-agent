-- Admin-managed recurring content maintenance schedules.

CREATE TABLE IF NOT EXISTS "MaintenanceSchedule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "kind" TEXT NOT NULL,
    "dryRun" BOOLEAN NOT NULL DEFAULT true,
    "targetPersonIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "options" JSONB NOT NULL DEFAULT '{}',
    "intervalHours" INTEGER NOT NULL DEFAULT 24,
    "nextRunAt" TIMESTAMP(3),
    "lastRunAt" TIMESTAMP(3),
    "lastJobId" TEXT,
    "runCount" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenanceSchedule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MaintenanceSchedule_enabled_nextRunAt_idx" ON "MaintenanceSchedule"("enabled", "nextRunAt");
CREATE INDEX IF NOT EXISTS "MaintenanceSchedule_kind_idx" ON "MaintenanceSchedule"("kind");
CREATE INDEX IF NOT EXISTS "MaintenanceSchedule_createdById_idx" ON "MaintenanceSchedule"("createdById");
CREATE INDEX IF NOT EXISTS "MaintenanceSchedule_lastJobId_idx" ON "MaintenanceSchedule"("lastJobId");

DO $$ BEGIN
    ALTER TABLE "MaintenanceSchedule"
        ADD CONSTRAINT "MaintenanceSchedule_createdById_fkey"
        FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
