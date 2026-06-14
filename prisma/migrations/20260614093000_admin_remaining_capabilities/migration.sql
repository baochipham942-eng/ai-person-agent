-- Remaining admin capabilities: quick login devices and data maintenance jobs.

CREATE TABLE IF NOT EXISTS "QuickLoginDevice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceName" TEXT,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    CONSTRAINT "QuickLoginDevice_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "QuickLoginDevice_tokenHash_key" ON "QuickLoginDevice"("tokenHash");
CREATE INDEX IF NOT EXISTS "QuickLoginDevice_userId_idx" ON "QuickLoginDevice"("userId");
CREATE INDEX IF NOT EXISTS "QuickLoginDevice_revokedAt_idx" ON "QuickLoginDevice"("revokedAt");
CREATE INDEX IF NOT EXISTS "QuickLoginDevice_lastUsedAt_idx" ON "QuickLoginDevice"("lastUsedAt");

DO $$ BEGIN
    ALTER TABLE "QuickLoginDevice"
        ADD CONSTRAINT "QuickLoginDevice_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "MaintenanceJob" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "dryRun" BOOLEAN NOT NULL DEFAULT true,
    "requestedById" TEXT,
    "targetPersonIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "options" JSONB NOT NULL DEFAULT '{}',
    "command" TEXT,
    "progressTotal" INTEGER NOT NULL DEFAULT 0,
    "progressDone" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenanceJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MaintenanceJob_kind_idx" ON "MaintenanceJob"("kind");
CREATE INDEX IF NOT EXISTS "MaintenanceJob_status_idx" ON "MaintenanceJob"("status");
CREATE INDEX IF NOT EXISTS "MaintenanceJob_requestedById_idx" ON "MaintenanceJob"("requestedById");
CREATE INDEX IF NOT EXISTS "MaintenanceJob_createdAt_idx" ON "MaintenanceJob"("createdAt");

DO $$ BEGIN
    ALTER TABLE "MaintenanceJob"
        ADD CONSTRAINT "MaintenanceJob_requestedById_fkey"
        FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "MaintenanceJobLog" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'info',
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaintenanceJobLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MaintenanceJobLog_jobId_createdAt_idx" ON "MaintenanceJobLog"("jobId", "createdAt");
CREATE INDEX IF NOT EXISTS "MaintenanceJobLog_level_idx" ON "MaintenanceJobLog"("level");

DO $$ BEGIN
    ALTER TABLE "MaintenanceJobLog"
        ADD CONSTRAINT "MaintenanceJobLog_jobId_fkey"
        FOREIGN KEY ("jobId") REFERENCES "MaintenanceJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
