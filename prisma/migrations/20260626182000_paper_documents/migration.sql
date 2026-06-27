-- CreateTable
CREATE TABLE "PaperDocument" (
    "id" TEXT NOT NULL,
    "sourceItemId" TEXT,
    "openalexId" TEXT,
    "doi" TEXT,
    "title" TEXT NOT NULL,
    "abstract" TEXT,
    "pdfUrl" TEXT,
    "landingPageUrl" TEXT,
    "authors" JSONB,
    "venue" TEXT,
    "citationCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'metadata_only',
    "parseVersion" TEXT,
    "pageCount" INTEGER,
    "textHash" TEXT,
    "parseError" TEXT,
    "parsedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperSection" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "pageStart" INTEGER,
    "pageEnd" INTEGER,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperChunk" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "sectionId" TEXT,
    "text" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "chunkIndex" INTEGER NOT NULL,
    "anchorHint" JSONB,
    "embeddingId" TEXT,
    "tokenEstimate" INTEGER NOT NULL DEFAULT 0,
    "textHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperFigure" (
    "id" TEXT NOT NULL,
    "paperId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "caption" TEXT,
    "pageNumber" INTEGER,
    "bbox" JSONB,
    "imagePath" TEXT,
    "orderIndex" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperFigure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaperDocument_sourceItemId_key" ON "PaperDocument"("sourceItemId");

-- CreateIndex
CREATE INDEX "PaperDocument_openalexId_idx" ON "PaperDocument"("openalexId");

-- CreateIndex
CREATE INDEX "PaperDocument_doi_idx" ON "PaperDocument"("doi");

-- CreateIndex
CREATE INDEX "PaperDocument_status_idx" ON "PaperDocument"("status");

-- CreateIndex
CREATE INDEX "PaperDocument_parsedAt_idx" ON "PaperDocument"("parsedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaperSection_paperId_orderIndex_key" ON "PaperSection"("paperId", "orderIndex");

-- CreateIndex
CREATE INDEX "PaperSection_paperId_idx" ON "PaperSection"("paperId");

-- CreateIndex
CREATE INDEX "PaperSection_sectionType_idx" ON "PaperSection"("sectionType");

-- CreateIndex
CREATE INDEX "PaperSection_paperId_sectionType_idx" ON "PaperSection"("paperId", "sectionType");

-- CreateIndex
CREATE UNIQUE INDEX "PaperChunk_paperId_chunkIndex_key" ON "PaperChunk"("paperId", "chunkIndex");

-- CreateIndex
CREATE INDEX "PaperChunk_paperId_idx" ON "PaperChunk"("paperId");

-- CreateIndex
CREATE INDEX "PaperChunk_sectionId_idx" ON "PaperChunk"("sectionId");

-- CreateIndex
CREATE INDEX "PaperChunk_pageNumber_idx" ON "PaperChunk"("pageNumber");

-- CreateIndex
CREATE INDEX "PaperChunk_textHash_idx" ON "PaperChunk"("textHash");

-- CreateIndex
CREATE UNIQUE INDEX "PaperFigure_paperId_orderIndex_key" ON "PaperFigure"("paperId", "orderIndex");

-- CreateIndex
CREATE INDEX "PaperFigure_paperId_idx" ON "PaperFigure"("paperId");

-- CreateIndex
CREATE INDEX "PaperFigure_pageNumber_idx" ON "PaperFigure"("pageNumber");

-- AddForeignKey
ALTER TABLE "PaperDocument"
    ADD CONSTRAINT "PaperDocument_sourceItemId_fkey"
    FOREIGN KEY ("sourceItemId") REFERENCES "RawPoolItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperSection"
    ADD CONSTRAINT "PaperSection_paperId_fkey"
    FOREIGN KEY ("paperId") REFERENCES "PaperDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperChunk"
    ADD CONSTRAINT "PaperChunk_paperId_fkey"
    FOREIGN KEY ("paperId") REFERENCES "PaperDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperChunk"
    ADD CONSTRAINT "PaperChunk_sectionId_fkey"
    FOREIGN KEY ("sectionId") REFERENCES "PaperSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperFigure"
    ADD CONSTRAINT "PaperFigure_paperId_fkey"
    FOREIGN KEY ("paperId") REFERENCES "PaperDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
