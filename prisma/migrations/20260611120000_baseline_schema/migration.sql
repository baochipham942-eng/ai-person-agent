-- Baseline migration for the existing Neon production schema.
-- The database already has these tables and indexes from earlier db push/manual changes.
-- Use `prisma migrate resolve --applied 20260611120000_baseline_schema`
-- on existing databases instead of replaying this SQL.

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "nickname" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "avatar" TEXT,
    "phone" TEXT,
    "quickLoginToken" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvitationCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'REGISTRATION',
    "maxUsages" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "channel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvitationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "People" (
    "id" TEXT NOT NULL,
    "qid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[],
    "description" TEXT,
    "whyImportant" TEXT,
    "aiContributionScore" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "avatarUrl" TEXT,
    "gender" TEXT,
    "country" TEXT,
    "occupation" TEXT[],
    "organization" TEXT[],
    "officialLinks" JSONB NOT NULL DEFAULT '[]',
    "sourceWhitelist" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completeness" INTEGER NOT NULL DEFAULT 0,
    "topics" TEXT[],
    "topicRanks" JSONB,
    "topicDetails" JSONB,
    "highlights" JSONB,
    "roleCategory" TEXT,
    "influenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quotes" JSONB,
    "currentTitle" TEXT,
    "products" JSONB,
    "education" JSONB,
    "citationCount" INTEGER NOT NULL DEFAULT 0,
    "hIndex" INTEGER NOT NULL DEFAULT 0,
    "openalexId" TEXT,
    "githubStars" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "weeklyViewCount" INTEGER NOT NULL DEFAULT 0,
    "lastFetchedAt" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "People_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameZh" TEXT,
    "type" TEXT NOT NULL,
    "wikidataQid" TEXT,
    "description" TEXT,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonRole" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "roleZh" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "source" TEXT NOT NULL DEFAULT 'wikidata',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "advisorId" TEXT,

    CONSTRAINT "PersonRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tags" TEXT[],
    "sourceUrl" TEXT,
    "importance" INTEGER NOT NULL DEFAULT 5,
    "generationId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RawPoolItem" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "urlHash" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "fetchStatus" TEXT NOT NULL DEFAULT 'success',
    "errorCode" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RawPoolItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "query" TEXT NOT NULL,
    "localHits" TEXT[],
    "wikidataCandidates" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confirmedPersonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "SearchSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "peopleInterests" JSONB NOT NULL DEFAULT '{}',
    "topicInterests" JSONB NOT NULL DEFAULT '{}',
    "readCards" TEXT[],
    "savedCards" TEXT[],
    "subscribedPeople" TEXT[],
    "newsletterFrequency" TEXT NOT NULL DEFAULT 'none',
    "newsletterEmail" TEXT,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "referrer" TEXT,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonRelation" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "relatedPersonId" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "description" TEXT,
    "source" TEXT NOT NULL DEFAULT 'wikidata',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "reviewStatus" TEXT NOT NULL DEFAULT 'needs_review',
    "evidenceUrl" TEXT,
    "evidenceNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PersonRelation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleZh" TEXT,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "urlHash" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "level" TEXT,
    "category" TEXT,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "duration" TEXT,
    "language" TEXT,
    "enrollments" INTEGER,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "prerequisite" TEXT,
    "learningOrder" INTEGER,
    "topics" TEXT[],
    "source" TEXT NOT NULL DEFAULT 'perplexity',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "publishedAt" TIMESTAMP(3),
    "lastUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QAAuditLog" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "urlHash" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "verdict" TEXT NOT NULL,
    "aboutPerson" DOUBLE PRECISION,
    "aiRelevant" DOUBLE PRECISION,
    "quality" DOUBLE PRECISION,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QAAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "InvitationCode_code_key" ON "InvitationCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "People_qid_key" ON "People"("qid");

-- CreateIndex
CREATE INDEX "People_name_idx" ON "People"("name");

-- CreateIndex
CREATE INDEX "People_status_idx" ON "People"("status");

-- CreateIndex
CREATE INDEX "People_influenceScore_idx" ON "People"("influenceScore");

-- CreateIndex
CREATE INDEX "People_roleCategory_idx" ON "People"("roleCategory");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_wikidataQid_key" ON "Organization"("wikidataQid");

-- CreateIndex
CREATE INDEX "Organization_name_idx" ON "Organization"("name");

-- CreateIndex
CREATE INDEX "Organization_wikidataQid_idx" ON "Organization"("wikidataQid");

-- CreateIndex
CREATE INDEX "PersonRole_personId_idx" ON "PersonRole"("personId");

-- CreateIndex
CREATE INDEX "PersonRole_organizationId_idx" ON "PersonRole"("organizationId");

-- CreateIndex
CREATE INDEX "PersonRole_advisorId_idx" ON "PersonRole"("advisorId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonRole_personId_organizationId_role_startDate_key" ON "PersonRole"("personId", "organizationId", "role", "startDate");

-- CreateIndex
CREATE INDEX "Card_personId_idx" ON "Card"("personId");

-- CreateIndex
CREATE INDEX "Card_personId_isActive_idx" ON "Card"("personId", "isActive");

-- CreateIndex
CREATE INDEX "Card_generationId_idx" ON "Card"("generationId");

-- CreateIndex
CREATE INDEX "Card_type_idx" ON "Card"("type");

-- CreateIndex
CREATE UNIQUE INDEX "RawPoolItem_urlHash_key" ON "RawPoolItem"("urlHash");

-- CreateIndex
CREATE INDEX "RawPoolItem_personId_idx" ON "RawPoolItem"("personId");

-- CreateIndex
CREATE INDEX "RawPoolItem_sourceType_idx" ON "RawPoolItem"("sourceType");

-- CreateIndex
CREATE INDEX "SearchSession_userId_idx" ON "SearchSession"("userId");

-- CreateIndex
CREATE INDEX "SearchSession_createdAt_idx" ON "SearchSession"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "PageView_personId_idx" ON "PageView"("personId");

-- CreateIndex
CREATE INDEX "PageView_viewedAt_idx" ON "PageView"("viewedAt");

-- CreateIndex
CREATE INDEX "PageView_personId_viewedAt_idx" ON "PageView"("personId", "viewedAt");

-- CreateIndex
CREATE INDEX "PageView_personId_visitorId_viewedAt_idx" ON "PageView"("personId", "visitorId", "viewedAt");

-- CreateIndex
CREATE INDEX "PersonRelation_personId_idx" ON "PersonRelation"("personId");

-- CreateIndex
CREATE INDEX "PersonRelation_relatedPersonId_idx" ON "PersonRelation"("relatedPersonId");

-- CreateIndex
CREATE INDEX "PersonRelation_reviewStatus_idx" ON "PersonRelation"("reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PersonRelation_personId_relatedPersonId_relationType_key" ON "PersonRelation"("personId", "relatedPersonId", "relationType");

-- CreateIndex
CREATE UNIQUE INDEX "Course_urlHash_key" ON "Course"("urlHash");

-- CreateIndex
CREATE INDEX "Course_personId_idx" ON "Course"("personId");

-- CreateIndex
CREATE INDEX "Course_platform_idx" ON "Course"("platform");

-- CreateIndex
CREATE INDEX "Course_type_idx" ON "Course"("type");

-- CreateIndex
CREATE INDEX "Course_level_idx" ON "Course"("level");

-- CreateIndex
CREATE INDEX "QAAuditLog_personId_idx" ON "QAAuditLog"("personId");

-- CreateIndex
CREATE INDEX "QAAuditLog_verdict_idx" ON "QAAuditLog"("verdict");

-- CreateIndex
CREATE INDEX "QAAuditLog_stage_idx" ON "QAAuditLog"("stage");

-- CreateIndex
CREATE INDEX "QAAuditLog_createdAt_idx" ON "QAAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "PersonRole" ADD CONSTRAINT "PersonRole_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonRole" ADD CONSTRAINT "PersonRole_personId_fkey" FOREIGN KEY ("personId") REFERENCES "People"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonRole" ADD CONSTRAINT "PersonRole_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "People"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Card" ADD CONSTRAINT "Card_personId_fkey" FOREIGN KEY ("personId") REFERENCES "People"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RawPoolItem" ADD CONSTRAINT "RawPoolItem_personId_fkey" FOREIGN KEY ("personId") REFERENCES "People"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchSession" ADD CONSTRAINT "SearchSession_confirmedPersonId_fkey" FOREIGN KEY ("confirmedPersonId") REFERENCES "People"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchSession" ADD CONSTRAINT "SearchSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_personId_fkey" FOREIGN KEY ("personId") REFERENCES "People"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonRelation" ADD CONSTRAINT "PersonRelation_personId_fkey" FOREIGN KEY ("personId") REFERENCES "People"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonRelation" ADD CONSTRAINT "PersonRelation_relatedPersonId_fkey" FOREIGN KEY ("relatedPersonId") REFERENCES "People"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_personId_fkey" FOREIGN KEY ("personId") REFERENCES "People"("id") ON DELETE CASCADE ON UPDATE CASCADE;
