CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

-- Hot-path composite indexes for the existing relational read model.
CREATE INDEX IF NOT EXISTS "People_status_influenceScore_idx" ON "People"("status", "influenceScore");
CREATE INDEX IF NOT EXISTS "People_topics_gin_idx" ON "People" USING GIN ("topics");
CREATE INDEX IF NOT EXISTS "People_organization_gin_idx" ON "People" USING GIN ("organization");
CREATE INDEX IF NOT EXISTS "People_aliases_gin_idx" ON "People" USING GIN ("aliases");
CREATE INDEX IF NOT EXISTS "People_name_trgm_idx" ON "People" USING GIN ("name" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "RawPoolItem_personId_sourceType_publishedAt_idx" ON "RawPoolItem"("personId", "sourceType", "publishedAt");
CREATE INDEX IF NOT EXISTS "RawPoolItem_personId_publishedAt_idx" ON "RawPoolItem"("personId", "publishedAt");
CREATE INDEX IF NOT EXISTS "RawPoolItem_fetchStatus_fetchedAt_idx" ON "RawPoolItem"("fetchStatus", "fetchedAt");
CREATE INDEX IF NOT EXISTS "RawPoolItem_title_trgm_idx" ON "RawPoolItem" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "RawPoolItem_metadata_sourceKind_idx" ON "RawPoolItem"((metadata->>'sourceKind'));
CREATE INDEX IF NOT EXISTS "RawPoolItem_youtube_video_person_published_idx"
  ON "RawPoolItem"("personId", "publishedAt" DESC NULLS LAST, "fetchedAt" DESC NULLS LAST, id)
  WHERE "sourceType" = 'youtube' AND metadata->>'sourceKind' IS DISTINCT FROM 'youtube_caption';

CREATE INDEX IF NOT EXISTS "CompanySource_organizationId_publishedAt_idx" ON "CompanySource"("organizationId", "publishedAt");
CREATE INDEX IF NOT EXISTS "CompanySource_sourceKind_publishedAt_idx" ON "CompanySource"("sourceKind", "publishedAt");
CREATE INDEX IF NOT EXISTS "CompanySource_title_trgm_idx" ON "CompanySource" USING GIN ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS "KnowledgeSource_sourceKind_publishedAt_idx" ON "KnowledgeSource"("sourceKind", "publishedAt");
CREATE INDEX IF NOT EXISTS "KnowledgeSource_title_trgm_idx" ON "KnowledgeSource" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "KnowledgeThread_tags_gin_idx" ON "KnowledgeThread" USING GIN ("tags");
CREATE INDEX IF NOT EXISTS "KnowledgeThread_aliases_gin_idx" ON "KnowledgeThread" USING GIN ("aliases");
CREATE INDEX IF NOT EXISTS "KnowledgeThreadSource_threadId_relevanceScore_createdAt_idx" ON "KnowledgeThreadSource"("threadId", "relevanceScore", "createdAt");
CREATE INDEX IF NOT EXISTS "KnowledgeThreadEdge_threadId_confidence_createdAt_idx" ON "KnowledgeThreadEdge"("threadId", "confidence", "createdAt");

CREATE INDEX IF NOT EXISTS "ActivityEvent_personId_occurredAt_idx" ON "ActivityEvent"("personId", "occurredAt");
CREATE INDEX IF NOT EXISTS "ActivityEvent_reviewStatus_occurredAt_idx" ON "ActivityEvent"("reviewStatus", "occurredAt");
CREATE INDEX IF NOT EXISTS "ActivityEvent_sourceType_occurredAt_idx" ON "ActivityEvent"("sourceType", "occurredAt");
CREATE INDEX IF NOT EXISTS "ActivityEvent_topics_gin_idx" ON "ActivityEvent" USING GIN ("topics");
CREATE INDEX IF NOT EXISTS "ActivityEvent_organizations_gin_idx" ON "ActivityEvent" USING GIN ("organizations");

CREATE INDEX IF NOT EXISTS "PersonRelation_personId_reviewStatus_confidence_idx" ON "PersonRelation"("personId", "reviewStatus", "confidence");
CREATE INDEX IF NOT EXISTS "PersonRelation_relatedPersonId_reviewStatus_confidence_idx" ON "PersonRelation"("relatedPersonId", "reviewStatus", "confidence");
CREATE INDEX IF NOT EXISTS "PersonRelation_reviewStatus_createdAt_idx" ON "PersonRelation"("reviewStatus", "createdAt");

CREATE TABLE "SearchDocument" (
  "id" TEXT NOT NULL,
  "objectType" TEXT NOT NULL,
  "objectId" TEXT NOT NULL,
  "canonicalKey" TEXT NOT NULL,
  "personId" TEXT,
  "threadId" TEXT,
  "organizationId" TEXT,
  "sourceType" TEXT,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "text" TEXT NOT NULL,
  "url" TEXT,
  "topics" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "organizations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "publishedAt" TIMESTAMP(3),
  "fetchedAt" TIMESTAMP(3),
  "textHash" TEXT NOT NULL,
  "embeddingStatus" TEXT NOT NULL DEFAULT 'pending',
  "metadata" JSONB,
  "searchVector" tsvector,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SearchDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ContentChunk" (
  "id" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "objectType" TEXT NOT NULL,
  "objectId" TEXT NOT NULL,
  "chunkIndex" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "tokenEstimate" INTEGER NOT NULL DEFAULT 0,
  "textHash" TEXT NOT NULL,
  "embedding" vector(512),
  "embeddingModel" TEXT,
  "embeddingUpdatedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "searchVector" tsvector,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentChunk_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ContentChunk"
  ADD CONSTRAINT "ContentChunk_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "SearchDocument"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "SearchDocument_canonicalKey_key" ON "SearchDocument"("canonicalKey");
CREATE UNIQUE INDEX IF NOT EXISTS "SearchDocument_objectType_objectId_key" ON "SearchDocument"("objectType", "objectId");
CREATE INDEX IF NOT EXISTS "SearchDocument_objectType_idx" ON "SearchDocument"("objectType");
CREATE INDEX IF NOT EXISTS "SearchDocument_personId_idx" ON "SearchDocument"("personId");
CREATE INDEX IF NOT EXISTS "SearchDocument_threadId_idx" ON "SearchDocument"("threadId");
CREATE INDEX IF NOT EXISTS "SearchDocument_organizationId_idx" ON "SearchDocument"("organizationId");
CREATE INDEX IF NOT EXISTS "SearchDocument_sourceType_idx" ON "SearchDocument"("sourceType");
CREATE INDEX IF NOT EXISTS "SearchDocument_publishedAt_idx" ON "SearchDocument"("publishedAt");
CREATE INDEX IF NOT EXISTS "SearchDocument_fetchedAt_idx" ON "SearchDocument"("fetchedAt");
CREATE INDEX IF NOT EXISTS "SearchDocument_embeddingStatus_idx" ON "SearchDocument"("embeddingStatus");
CREATE INDEX IF NOT EXISTS "SearchDocument_objectType_publishedAt_idx" ON "SearchDocument"("objectType", "publishedAt");
CREATE INDEX IF NOT EXISTS "SearchDocument_personId_publishedAt_idx" ON "SearchDocument"("personId", "publishedAt");
CREATE INDEX IF NOT EXISTS "SearchDocument_threadId_publishedAt_idx" ON "SearchDocument"("threadId", "publishedAt");
CREATE INDEX IF NOT EXISTS "SearchDocument_topics_gin_idx" ON "SearchDocument" USING GIN ("topics");
CREATE INDEX IF NOT EXISTS "SearchDocument_organizations_gin_idx" ON "SearchDocument" USING GIN ("organizations");
CREATE INDEX IF NOT EXISTS "SearchDocument_title_trgm_idx" ON "SearchDocument" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "SearchDocument_searchVector_idx" ON "SearchDocument" USING GIN ("searchVector");

CREATE UNIQUE INDEX IF NOT EXISTS "ContentChunk_documentId_chunkIndex_key" ON "ContentChunk"("documentId", "chunkIndex");
CREATE INDEX IF NOT EXISTS "ContentChunk_documentId_idx" ON "ContentChunk"("documentId");
CREATE INDEX IF NOT EXISTS "ContentChunk_objectType_objectId_idx" ON "ContentChunk"("objectType", "objectId");
CREATE INDEX IF NOT EXISTS "ContentChunk_embeddingModel_idx" ON "ContentChunk"("embeddingModel");
CREATE INDEX IF NOT EXISTS "ContentChunk_textHash_idx" ON "ContentChunk"("textHash");
CREATE INDEX IF NOT EXISTS "ContentChunk_searchVector_idx" ON "ContentChunk" USING GIN ("searchVector");
CREATE INDEX IF NOT EXISTS "ContentChunk_embedding_hnsw_idx"
  ON "ContentChunk" USING hnsw ("embedding" vector_cosine_ops)
  WHERE "embedding" IS NOT NULL;

CREATE OR REPLACE FUNCTION refresh_search_document_vector()
RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."summary", '')), 'B') ||
    setweight(to_tsvector('simple', coalesce(NEW."text", '')), 'C') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(NEW."topics", ARRAY[]::TEXT[]), ' ')), 'B') ||
    setweight(to_tsvector('simple', array_to_string(coalesce(NEW."organizations", ARRAY[]::TEXT[]), ' ')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_content_chunk_vector()
RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('simple', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW."text", '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "SearchDocument_refresh_searchVector"
BEFORE INSERT OR UPDATE OF "title", "summary", "text", "topics", "organizations"
ON "SearchDocument"
FOR EACH ROW EXECUTE FUNCTION refresh_search_document_vector();

CREATE TRIGGER "ContentChunk_refresh_searchVector"
BEFORE INSERT OR UPDATE OF "title", "text"
ON "ContentChunk"
FOR EACH ROW EXECUTE FUNCTION refresh_content_chunk_vector();
