DROP INDEX IF EXISTS "ContentChunk_embedding_hnsw_idx";

ALTER TABLE "ContentChunk"
  DROP COLUMN IF EXISTS "embedding";

ALTER TABLE "ContentChunk"
  ADD COLUMN "embedding" vector(512);

UPDATE "ContentChunk"
SET
  "embeddingModel" = NULL,
  "embeddingUpdatedAt" = NULL,
  "updatedAt" = now();

UPDATE "SearchDocument" d
SET
  "embeddingStatus" = CASE
    WHEN NOT EXISTS (
      SELECT 1 FROM "ContentChunk" c WHERE c."documentId" = d.id
    ) THEN 'skipped'
    ELSE 'pending'
  END,
  "updatedAt" = now();

CREATE INDEX IF NOT EXISTS "ContentChunk_embedding_hnsw_idx"
  ON "ContentChunk" USING hnsw ("embedding" vector_cosine_ops)
  WHERE "embedding" IS NOT NULL;
