-- P3 paper entity review queue.
-- Stores paper author / organization mentions as review candidates without
-- automatically creating or linking People / Organization records.
CREATE TABLE "PaperEntityReview" (
    "id" TEXT NOT NULL,
    "sourceItemId" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityKind" TEXT NOT NULL,
    "mentionType" TEXT NOT NULL,
    "matchReason" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "candidatePeople" JSONB,
    "candidateOrganizations" JSONB,
    "reviewStatus" TEXT NOT NULL DEFAULT 'needs_review',
    "confirmedPersonId" TEXT,
    "confirmedOrganizationId" TEXT,
    "evidenceQuote" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaperEntityReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PaperEntityReview_sourceItemId_entityKind_mentionType_entityName_key"
    ON "PaperEntityReview"("sourceItemId", "entityKind", "mentionType", "entityName");
CREATE INDEX "PaperEntityReview_sourceItemId_idx" ON "PaperEntityReview"("sourceItemId");
CREATE INDEX "PaperEntityReview_entityKind_idx" ON "PaperEntityReview"("entityKind");
CREATE INDEX "PaperEntityReview_reviewStatus_idx" ON "PaperEntityReview"("reviewStatus");
CREATE INDEX "PaperEntityReview_confirmedPersonId_idx" ON "PaperEntityReview"("confirmedPersonId");
CREATE INDEX "PaperEntityReview_confirmedOrganizationId_idx" ON "PaperEntityReview"("confirmedOrganizationId");
CREATE INDEX "PaperEntityReview_entityKind_reviewStatus_confidence_idx"
    ON "PaperEntityReview"("entityKind", "reviewStatus", "confidence");

ALTER TABLE "PaperEntityReview"
    ADD CONSTRAINT "PaperEntityReview_sourceItemId_fkey"
    FOREIGN KEY ("sourceItemId") REFERENCES "RawPoolItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaperEntityReview"
    ADD CONSTRAINT "PaperEntityReview_confirmedPersonId_fkey"
    FOREIGN KEY ("confirmedPersonId") REFERENCES "People"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaperEntityReview"
    ADD CONSTRAINT "PaperEntityReview_confirmedOrganizationId_fkey"
    FOREIGN KEY ("confirmedOrganizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
