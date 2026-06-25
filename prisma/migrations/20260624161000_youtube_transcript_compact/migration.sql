-- Compact YouTube transcript storage: one row per person/video.
-- The previous segment-per-row table exceeded the current Neon project size cap.

-- Free old secondary indexes before creating the compact table. Keeping the old
-- segment heap preserves data while releasing enough room under the Neon cap.
DROP INDEX IF EXISTS "YouTubeTranscriptSegment_personId_videoId_startMs_textHash_key";
DROP INDEX IF EXISTS "YouTubeTranscriptSegment_personId_idx";
DROP INDEX IF EXISTS "YouTubeTranscriptSegment_videoId_idx";
DROP INDEX IF EXISTS "YouTubeTranscriptSegment_personId_videoId_startMs_idx";
DROP INDEX IF EXISTS "YouTubeTranscriptSegment_captionItemId_idx";
DROP INDEX IF EXISTS "YouTubeTranscriptSegment_sourceItemId_idx";
DROP INDEX IF EXISTS "YouTubeTranscriptSegment_fetchedAt_idx";

-- CreateTable
CREATE TABLE "YouTubeTranscript" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "lang" TEXT,
    "segmentsText" TEXT NOT NULL,
    "segmentCount" INTEGER NOT NULL,
    "durationMs" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'supadata',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "captionItemId" TEXT,
    "sourceItemId" TEXT,

    CONSTRAINT "YouTubeTranscript_pkey" PRIMARY KEY ("id")
);

-- Migrate existing fetched segment data into compact text.
INSERT INTO "YouTubeTranscript" (
    "id",
    "personId",
    "videoId",
    "url",
    "lang",
    "segmentsText",
    "segmentCount",
    "durationMs",
    "source",
    "fetchedAt",
    "createdAt",
    "updatedAt",
    "captionItemId",
    "sourceItemId"
)
SELECT
    'yt_' || md5("personId" || ':' || "videoId") AS "id",
    "personId",
    "videoId",
    (ARRAY_AGG("url" ORDER BY "segmentIndex"))[1] AS "url",
    (ARRAY_AGG("lang" ORDER BY "segmentIndex") FILTER (WHERE "lang" IS NOT NULL))[1] AS "lang",
    STRING_AGG(
        "startMs"::text || E'\t' || COALESCE("durationMs"::text, '') || E'\t' || TO_JSONB("text")::text,
        E'\n'
        ORDER BY "segmentIndex"
    ) AS "segmentsText",
    COUNT(*)::integer AS "segmentCount",
    MAX("startMs" + COALESCE("durationMs", 0))::integer AS "durationMs",
    (ARRAY_AGG("source" ORDER BY "segmentIndex"))[1] AS "source",
    MAX("fetchedAt") AS "fetchedAt",
    MIN("createdAt") AS "createdAt",
    MAX("updatedAt") AS "updatedAt",
    (ARRAY_AGG("captionItemId" ORDER BY "segmentIndex") FILTER (WHERE "captionItemId" IS NOT NULL))[1] AS "captionItemId",
    (ARRAY_AGG("sourceItemId" ORDER BY "segmentIndex") FILTER (WHERE "sourceItemId" IS NOT NULL))[1] AS "sourceItemId"
FROM "YouTubeTranscriptSegment"
GROUP BY "personId", "videoId";

-- Drop the large segment-per-row table before creating compact indexes.
DROP TABLE "YouTubeTranscriptSegment";

-- CreateIndex
CREATE UNIQUE INDEX "YouTubeTranscript_personId_videoId_key"
    ON "YouTubeTranscript"("personId", "videoId");

-- CreateIndex
CREATE INDEX "YouTubeTranscript_personId_idx" ON "YouTubeTranscript"("personId");

-- CreateIndex
CREATE INDEX "YouTubeTranscript_videoId_idx" ON "YouTubeTranscript"("videoId");

-- CreateIndex
CREATE INDEX "YouTubeTranscript_captionItemId_idx" ON "YouTubeTranscript"("captionItemId");

-- CreateIndex
CREATE INDEX "YouTubeTranscript_sourceItemId_idx" ON "YouTubeTranscript"("sourceItemId");

-- CreateIndex
CREATE INDEX "YouTubeTranscript_fetchedAt_idx" ON "YouTubeTranscript"("fetchedAt");

-- AddForeignKey
ALTER TABLE "YouTubeTranscript"
    ADD CONSTRAINT "YouTubeTranscript_personId_fkey"
    FOREIGN KEY ("personId") REFERENCES "People"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YouTubeTranscript"
    ADD CONSTRAINT "YouTubeTranscript_captionItemId_fkey"
    FOREIGN KEY ("captionItemId") REFERENCES "RawPoolItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "YouTubeTranscript"
    ADD CONSTRAINT "YouTubeTranscript_sourceItemId_fkey"
    FOREIGN KEY ("sourceItemId") REFERENCES "RawPoolItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
