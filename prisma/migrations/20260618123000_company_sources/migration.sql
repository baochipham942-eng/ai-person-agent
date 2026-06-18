-- CreateTable
CREATE TABLE "CompanySource" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "sourceKind" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "finalUrl" TEXT,
    "canonicalUrl" TEXT NOT NULL,
    "urlHash" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "summary" TEXT,
    "publishedAt" TIMESTAMP(3),
    "fetchedAt" TIMESTAMP(3),
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "readinessUse" TEXT NOT NULL DEFAULT 'company_page_only',
    "excludedFromTopicReadiness" BOOLEAN NOT NULL DEFAULT true,
    "companyPageOnly" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyThreadLink" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "threadSlug" TEXT NOT NULL,
    "threadTitle" TEXT NOT NULL,
    "relationType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "evidenceSourceIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "excludedFromTopicReadiness" BOOLEAN NOT NULL DEFAULT true,
    "countsTowardTopicReadiness" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyThreadLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompanySource_urlHash_key" ON "CompanySource"("urlHash");

-- CreateIndex
CREATE INDEX "CompanySource_organizationId_idx" ON "CompanySource"("organizationId");

-- CreateIndex
CREATE INDEX "CompanySource_role_idx" ON "CompanySource"("role");

-- CreateIndex
CREATE INDEX "CompanySource_sourceKind_idx" ON "CompanySource"("sourceKind");

-- CreateIndex
CREATE INDEX "CompanySource_publishedAt_idx" ON "CompanySource"("publishedAt");

-- CreateIndex
CREATE INDEX "CompanySource_fetchedAt_idx" ON "CompanySource"("fetchedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyThreadLink_organizationId_threadSlug_relationType_key" ON "CompanyThreadLink"("organizationId", "threadSlug", "relationType");

-- CreateIndex
CREATE INDEX "CompanyThreadLink_organizationId_idx" ON "CompanyThreadLink"("organizationId");

-- CreateIndex
CREATE INDEX "CompanyThreadLink_threadSlug_idx" ON "CompanyThreadLink"("threadSlug");

-- CreateIndex
CREATE INDEX "CompanyThreadLink_relationType_idx" ON "CompanyThreadLink"("relationType");

-- AddForeignKey
ALTER TABLE "CompanySource" ADD CONSTRAINT "CompanySource_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyThreadLink" ADD CONSTRAINT "CompanyThreadLink_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
