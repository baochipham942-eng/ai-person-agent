-- Persistent rate-limit events for auth and email flows.

CREATE TABLE IF NOT EXISTS "AuthRateLimitEvent" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuthRateLimitEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuthRateLimitEvent_key_action_createdAt_idx" ON "AuthRateLimitEvent"("key", "action", "createdAt");
CREATE INDEX IF NOT EXISTS "AuthRateLimitEvent_createdAt_idx" ON "AuthRateLimitEvent"("createdAt");

