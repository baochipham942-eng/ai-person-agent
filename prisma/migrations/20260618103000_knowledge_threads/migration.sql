-- CreateTable
CREATE TABLE "KnowledgeThread" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "whyNow" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "priorityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "category" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "refreshCadenceDays" INTEGER NOT NULL DEFAULT 14,
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeSource" (
    "id" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "sourceOwner" TEXT,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "urlHash" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeThreadSource" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "sourceId" TEXT,
    "rawPoolItemId" TEXT,
    "role" TEXT NOT NULL,
    "relevanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "sourceWeight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "evidenceQuote" TEXT,
    "summary" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeThreadSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeThreadEdge" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "fromSourceId" TEXT NOT NULL,
    "toSourceId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "evidenceNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeThreadEdge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeThread_slug_key" ON "KnowledgeThread"("slug");

-- CreateIndex
CREATE INDEX "KnowledgeThread_status_idx" ON "KnowledgeThread"("status");

-- CreateIndex
CREATE INDEX "KnowledgeThread_priorityScore_idx" ON "KnowledgeThread"("priorityScore");

-- CreateIndex
CREATE INDEX "KnowledgeThread_lastReviewedAt_idx" ON "KnowledgeThread"("lastReviewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeSource_urlHash_key" ON "KnowledgeSource"("urlHash");

-- CreateIndex
CREATE INDEX "KnowledgeSource_sourceKind_idx" ON "KnowledgeSource"("sourceKind");

-- CreateIndex
CREATE INDEX "KnowledgeSource_sourceOwner_idx" ON "KnowledgeSource"("sourceOwner");

-- CreateIndex
CREATE INDEX "KnowledgeSource_publishedAt_idx" ON "KnowledgeSource"("publishedAt");

-- CreateIndex
CREATE INDEX "KnowledgeSource_fetchedAt_idx" ON "KnowledgeSource"("fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeThreadSource_threadId_sourceId_role_key" ON "KnowledgeThreadSource"("threadId", "sourceId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeThreadSource_threadId_rawPoolItemId_role_key" ON "KnowledgeThreadSource"("threadId", "rawPoolItemId", "role");

-- CreateIndex
CREATE INDEX "KnowledgeThreadSource_threadId_idx" ON "KnowledgeThreadSource"("threadId");

-- CreateIndex
CREATE INDEX "KnowledgeThreadSource_sourceId_idx" ON "KnowledgeThreadSource"("sourceId");

-- CreateIndex
CREATE INDEX "KnowledgeThreadSource_rawPoolItemId_idx" ON "KnowledgeThreadSource"("rawPoolItemId");

-- CreateIndex
CREATE INDEX "KnowledgeThreadSource_role_idx" ON "KnowledgeThreadSource"("role");

-- CreateIndex
CREATE INDEX "KnowledgeThreadSource_relevanceScore_idx" ON "KnowledgeThreadSource"("relevanceScore");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeThreadEdge_threadId_fromSourceId_toSourceId_relationType_key" ON "KnowledgeThreadEdge"("threadId", "fromSourceId", "toSourceId", "relationType");

-- CreateIndex
CREATE INDEX "KnowledgeThreadEdge_threadId_idx" ON "KnowledgeThreadEdge"("threadId");

-- CreateIndex
CREATE INDEX "KnowledgeThreadEdge_fromSourceId_idx" ON "KnowledgeThreadEdge"("fromSourceId");

-- CreateIndex
CREATE INDEX "KnowledgeThreadEdge_toSourceId_idx" ON "KnowledgeThreadEdge"("toSourceId");

-- CreateIndex
CREATE INDEX "KnowledgeThreadEdge_relationType_idx" ON "KnowledgeThreadEdge"("relationType");

-- CreateIndex
CREATE INDEX "KnowledgeThreadEdge_confidence_idx" ON "KnowledgeThreadEdge"("confidence");

-- AddForeignKey
ALTER TABLE "KnowledgeThreadSource" ADD CONSTRAINT "KnowledgeThreadSource_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "KnowledgeThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeThreadSource" ADD CONSTRAINT "KnowledgeThreadSource_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeThreadSource" ADD CONSTRAINT "KnowledgeThreadSource_rawPoolItemId_fkey" FOREIGN KEY ("rawPoolItemId") REFERENCES "RawPoolItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeThreadEdge" ADD CONSTRAINT "KnowledgeThreadEdge_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "KnowledgeThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeThreadEdge" ADD CONSTRAINT "KnowledgeThreadEdge_fromSourceId_fkey" FOREIGN KEY ("fromSourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeThreadEdge" ADD CONSTRAINT "KnowledgeThreadEdge_toSourceId_fkey" FOREIGN KEY ("toSourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
