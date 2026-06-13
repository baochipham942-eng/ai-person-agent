ALTER TABLE "NewsletterDeliveryLog"
ADD COLUMN "provider" TEXT,
ADD COLUMN "providerMessageId" TEXT,
ADD COLUMN "attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "lastAttemptAt" TIMESTAMP(3);

CREATE INDEX "NewsletterDeliveryLog_provider_idx" ON "NewsletterDeliveryLog"("provider");
