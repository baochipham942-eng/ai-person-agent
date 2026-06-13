ALTER TABLE "ActivityEvent"
  ADD COLUMN IF NOT EXISTS "reviewStatus" TEXT NOT NULL DEFAULT 'auto';

CREATE INDEX IF NOT EXISTS "ActivityEvent_reviewStatus_idx"
  ON "ActivityEvent"("reviewStatus");
