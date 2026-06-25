-- CreateTable
CREATE TABLE "YouTubeTranscriptSegment" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "textHash" TEXT NOT NULL,
    "lang" TEXT,
    "startMs" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "segmentIndex" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'supadata',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "captionItemId" TEXT,
    "sourceItemId" TEXT,

    CONSTRAINT "YouTubeTranscriptSegment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "YouTubeTranscriptSegment_personId_videoId_startMs_textHash_key"
    ON "YouTubeTranscriptSegment"("personId", "videoId", "startMs", "textHash");

-- CreateIndex
CREATE INDEX "YouTubeTranscriptSegment_personId_idx" ON "YouTubeTranscriptSegment"("personId");

-- CreateIndex
CREATE INDEX "YouTubeTranscriptSegment_videoId_idx" ON "YouTubeTranscriptSegment"("videoId");

-- CreateIndex
CREATE INDEX "YouTubeTranscriptSegment_personId_videoId_startMs_idx"
    ON "YouTubeTranscriptSegment"("personId", "videoId", "startMs");

-- CreateIndex
CREATE INDEX "YouTubeTranscriptSegment_captionItemId_idx" ON "YouTubeTranscriptSegment"("captionItemId");

-- CreateIndex
CREATE INDEX "YouTubeTranscriptSegment_sourceItemId_idx" ON "YouTubeTranscriptSegment"("sourceItemId");

-- CreateIndex
CREATE INDEX "YouTubeTranscriptSegment_fetchedAt_idx" ON "YouTubeTranscriptSegment"("fetchedAt");

-- AddForeignKey
ALTER TABLE "YouTubeTranscriptSegment"
    ADD CONSTRAINT "YouTubeTranscriptSegment_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "People"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YouTubeTranscriptSegment"
    ADD CONSTRAINT "YouTubeTranscriptSegment_captionItemId_fkey"
    FOREIGN KEY ("captionItemId") REFERENCES "RawPoolItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YouTubeTranscriptSegment"
    ADD CONSTRAINT "YouTubeTranscriptSegment_sourceItemId_fkey"
    FOREIGN KEY ("sourceItemId") REFERENCES "RawPoolItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
