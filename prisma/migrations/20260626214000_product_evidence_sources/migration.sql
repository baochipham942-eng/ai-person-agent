-- Product/Work evidence sources for Paper Source Workspace P3.

CREATE TABLE IF NOT EXISTS "ProductEvidenceSource" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "rawPoolItemId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "matchReason" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "summary" TEXT,
    "evidenceQuote" TEXT,
    "reviewStatus" TEXT NOT NULL DEFAULT 'auto',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductEvidenceSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProductEvidenceSource_productId_rawPoolItemId_role_key"
    ON "ProductEvidenceSource"("productId", "rawPoolItemId", "role");
CREATE INDEX IF NOT EXISTS "ProductEvidenceSource_productId_idx" ON "ProductEvidenceSource"("productId");
CREATE INDEX IF NOT EXISTS "ProductEvidenceSource_rawPoolItemId_idx" ON "ProductEvidenceSource"("rawPoolItemId");
CREATE INDEX IF NOT EXISTS "ProductEvidenceSource_role_idx" ON "ProductEvidenceSource"("role");
CREATE INDEX IF NOT EXISTS "ProductEvidenceSource_reviewStatus_idx" ON "ProductEvidenceSource"("reviewStatus");

DO $$ BEGIN
    ALTER TABLE "ProductEvidenceSource"
        ADD CONSTRAINT "ProductEvidenceSource_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ProductEvidenceSource"
        ADD CONSTRAINT "ProductEvidenceSource_rawPoolItemId_fkey"
        FOREIGN KEY ("rawPoolItemId") REFERENCES "RawPoolItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
