-- CreateTable
CREATE TABLE "NewsletterDeliveryLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "deliveryType" TEXT NOT NULL DEFAULT 'weekly_digest',
    "subject" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'dry_run',
    "payload" JSONB,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "NewsletterDeliveryLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NewsletterDeliveryLog_userId_idx" ON "NewsletterDeliveryLog"("userId");

-- CreateIndex
CREATE INDEX "NewsletterDeliveryLog_email_idx" ON "NewsletterDeliveryLog"("email");

-- CreateIndex
CREATE INDEX "NewsletterDeliveryLog_status_idx" ON "NewsletterDeliveryLog"("status");

-- CreateIndex
CREATE INDEX "NewsletterDeliveryLog_createdAt_idx" ON "NewsletterDeliveryLog"("createdAt");

-- AddForeignKey
ALTER TABLE "NewsletterDeliveryLog" ADD CONSTRAINT "NewsletterDeliveryLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
