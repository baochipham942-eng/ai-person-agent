#!/usr/bin/env tsx
import type { Prisma } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const OPENALEX_WORKS_URL = 'https://api.openalex.org/works';
const OPENALEX_MAILTO = process.env.OPENALEX_MAILTO || 'ai-person-agent@example.com';

interface Options {
  sourceId: string | null;
  limit: number;
  execute: boolean;
  force: boolean;
  allowRemoteDev: boolean;
  allowVercelEnv: boolean;
  help: boolean;
}

interface DbInfo {
  configured: boolean;
  host: string | null;
  database: string | null;
  local: boolean;
  vercel: boolean;
}

interface LookupCandidate {
  kind: 'work_id' | 'doi' | 'arxiv_doi' | 'title_search';
  url: string;
}

interface PaperSourceRow {
  id: string;
  sourceType: string;
  title: string;
  url: string;
  text: string;
  publishedAt: Date | null;
  metadata: Prisma.JsonValue | null;
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  });

async function main() {
  const [{ prisma }] = await Promise.all([
    import('@/lib/db/prisma'),
  ]);
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    await prisma.$disconnect();
    return;
  }

  try {
    const db = getDbInfo();
    if (options.execute) assertWritableDb(db, options);

    const sources = options.sourceId
      ? await withNeonWakeup(() => prisma.rawPoolItem.findMany({
        where: { id: options.sourceId, sourceType: 'openalex' },
        select: paperSourceSelect(),
      }), prisma)
      : await withNeonWakeup(() => prisma.rawPoolItem.findMany({
        where: { sourceType: 'openalex' },
        orderBy: [
          { publishedAt: 'desc' },
          { fetchedAt: 'desc' },
        ],
        take: options.limit,
        select: paperSourceSelect(),
      }), prisma);

    const results = [];
    let enriched = 0;
    let skipped = 0;
    let failed = 0;

    for (const source of sources) {
      const metadata = asRecord(source.metadata);
      if (!options.force && Array.isArray(metadata.authors) && metadata.authors.length > 0) {
        skipped += 1;
        results.push({
          sourceItemId: source.id,
          sourceTitle: source.title,
          status: 'skipped',
          reason: 'authors_already_present',
          authorCount: metadata.authors.length,
        });
        continue;
      }

      const resolution = await resolveOpenAlexWorkForSource(source);
      if (!resolution.work) {
        failed += 1;
        results.push({
          sourceItemId: source.id,
          sourceTitle: source.title,
          status: 'failed',
          reason: resolution.message,
          attempts: resolution.attempts,
        });
        continue;
      }

      const patch = buildAuthorshipMetadataPatch(source, metadata, resolution.work, resolution);
      const authorCount = Array.isArray(patch.authors) ? patch.authors.length : 0;
      if (authorCount === 0) {
        skipped += 1;
        results.push({
          sourceItemId: source.id,
          sourceTitle: source.title,
          status: 'skipped',
          reason: 'openalex_no_authorships',
          lookup: resolution.summary,
        });
        continue;
      }

      if (options.execute) {
        await withNeonWakeup(() => prisma.rawPoolItem.update({
          where: { id: source.id },
          data: {
            metadata: {
              ...metadata,
              ...patch,
            } as Prisma.InputJsonValue,
          },
        }), prisma);
      }
      enriched += 1;
      results.push({
        sourceItemId: source.id,
        sourceTitle: source.title,
        status: options.execute ? 'enriched' : 'dry_run',
        authorCount,
        organizationCount: Array.isArray(patch.organizations) ? patch.organizations.length : 0,
        lookup: resolution.summary,
        authorNames: patch.authorNames,
      });
    }

    console.log(JSON.stringify({
      dryRun: !options.execute,
      db,
      options: {
        sourceId: options.sourceId,
        limit: options.limit,
        force: options.force,
      },
      scannedSources: sources.length,
      enriched,
      skipped,
      failed,
      results,
    }, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

function paperSourceSelect() {
  return {
    id: true,
    sourceType: true,
    title: true,
    url: true,
    text: true,
    publishedAt: true,
    metadata: true,
  } as const;
}

async function resolveOpenAlexWorkForSource(source: PaperSourceRow) {
  const metadata = asRecord(source.metadata);
  const candidates = buildLookupCandidates(source);
  const attempts = [];
  for (const candidate of candidates) {
    const response = await fetchOpenAlexCandidate(candidate);
    const works = response.works;
    attempts.push({
      kind: candidate.kind,
      url: redactOpenAlexUrl(candidate.url),
      ok: response.ok,
      status: response.status,
      message: response.message,
      title: works[0] ? readString(works[0].title) : null,
      resultCount: works.length,
    });
    if (works.length === 0) continue;

    let acceptedWork: Record<string, unknown> | null = null;
    let acceptedIdentity: ReturnType<typeof assessWorkIdentity> | null = null;
    let strongestIdentity: ReturnType<typeof assessWorkIdentity> | null = null;
    for (const work of works) {
      const identity = assessWorkIdentity(source, metadata, work);
      if (!strongestIdentity || identity.titleSimilarity > strongestIdentity.titleSimilarity) {
        strongestIdentity = identity;
      }
      if (!identity.accepted) continue;
      acceptedWork = work;
      acceptedIdentity = identity;
      break;
    }
    if (!acceptedWork || !acceptedIdentity) {
      const bestMatches = strongestIdentity?.matches.join('|') || 'none';
      const rejectReason = strongestIdentity?.rejectReason || 'no_identity_match';
      attempts[attempts.length - 1] = {
        ...attempts[attempts.length - 1],
        message: `identity_not_accepted:${rejectReason}:${bestMatches}`,
      };
      continue;
    }

    return {
      work: acceptedWork,
      attempts,
      summary: {
        lookupKind: candidate.kind,
        lookupUrl: redactOpenAlexUrl(candidate.url),
        openalexWorkId: readString(acceptedWork.id),
        workTitle: readString(acceptedWork.title),
        titleSimilarity: acceptedIdentity.titleSimilarity,
        titleMismatch: acceptedIdentity.titleMismatch,
        identityMatches: acceptedIdentity.matches,
      },
      message: null,
    };
  }

  return {
    work: null,
    attempts,
    summary: null,
    message: attempts.length > 0 ? 'no_accepted_openalex_work' : 'missing_openalex_lookup_identifier',
  };
}

function buildLookupCandidates(source: PaperSourceRow): LookupCandidate[] {
  const metadata = asRecord(source.metadata);
  const params = openAlexParams();
  const candidates: LookupCandidate[] = [];
  const workId = cleanOpenAlexWorkId(readString(metadata.openalexWorkId) || readString(metadata.openalexId) || source.url);
  const doi = normalizeDoi(readString(metadata.doi) || source.url);
  const arxivId = extractArxivId(source.url)
    || extractArxivId(readString(metadata.doi))
    || extractArxivId(readString(metadata.openalexWorkId))
    || extractArxivId(readString(metadata.openalexId));

  if (workId) candidates.push({ kind: 'work_id', url: `${OPENALEX_WORKS_URL}/${workId}?${params}` });
  if (doi) candidates.push({ kind: 'doi', url: `${OPENALEX_WORKS_URL}/doi:${encodeURIComponent(doi)}?${params}` });
  if (arxivId) {
    const arxivDoi = `10.48550/arxiv.${stripArxivVersion(arxivId)}`;
    candidates.push({ kind: 'arxiv_doi', url: `${OPENALEX_WORKS_URL}/doi:${encodeURIComponent(arxivDoi)}?${params}` });
  }
  if (source.title) {
    const searchParams = openAlexParams();
    searchParams.set('search', source.title);
    searchParams.set('per-page', '5');
    candidates.push({ kind: 'title_search', url: `${OPENALEX_WORKS_URL}?${searchParams}` });
  }

  return dedupeLookupCandidates(candidates);
}

async function fetchOpenAlexCandidate(candidate: LookupCandidate): Promise<{
  ok: boolean;
  status: number | null;
  message: string | null;
  works: Record<string, unknown>[];
}> {
  try {
    const response = await fetch(candidate.url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': `ai-person-agent/0.5.0 (mailto:${OPENALEX_MAILTO})`,
      },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return { ok: false, status: response.status, message: `openalex_http_${response.status}`, works: [] };
    const data = asRecord(await response.json());
    if (candidate.kind === 'title_search') {
      const results = Array.isArray(data.results) ? data.results.map(asRecord) : [];
      return { ok: true, status: response.status, message: null, works: results.slice(0, 5) };
    }
    return { ok: true, status: response.status, message: null, works: [data] };
  } catch (error) {
    return {
      ok: false,
      status: null,
      message: error instanceof Error ? error.message : String(error),
      works: [],
    };
  }
}

function assessWorkIdentity(source: PaperSourceRow, metadata: Record<string, unknown>, work: Record<string, unknown>) {
  const sourceWorkId = cleanOpenAlexWorkId(readString(metadata.openalexWorkId) || readString(metadata.openalexId) || source.url);
  const workId = cleanOpenAlexWorkId(readString(work.id));
  const sourceDoi = normalizeDoi(readString(metadata.doi) || source.url);
  const workDoi = normalizeDoi(readString(work.doi) || readString(asRecord(work.ids).doi));
  const sourceArxivId = stripArxivVersion(
    extractArxivId(source.url)
    || extractArxivId(sourceDoi)
    || extractArxivId(readString(metadata.openalexWorkId))
    || extractArxivId(readString(metadata.openalexId))
    || '',
  );
  const workArxivIds = extractWorkArxivIds(work).map(stripArxivVersion);
  const titleSimilarity = compareTitles(source.title, readString(work.title) || readString(work.display_name) || '');
  const matches = [];

  if (sourceWorkId && workId && sourceWorkId === workId) matches.push('work_id_exact');
  if (sourceDoi && workDoi && sourceDoi === workDoi) matches.push('doi_exact');
  if (sourceArxivId && workArxivIds.includes(sourceArxivId)) matches.push('arxiv_exact');
  if (titleSimilarity >= 0.88) matches.push('title_match');

  const hasStrongIdentifier = matches.some(match => match === 'work_id_exact' || match === 'doi_exact');
  const hasTitleMatch = matches.includes('title_match');
  const hasArxivBackedTitle = matches.includes('arxiv_exact') && titleSimilarity >= 0.25;
  const accepted = hasStrongIdentifier || hasTitleMatch || hasArxivBackedTitle;
  const rejectReason = matches.includes('arxiv_exact') && titleSimilarity < 0.25
    ? 'arxiv_title_mismatch'
    : 'no_identity_match';
  return {
    accepted,
    matches,
    rejectReason,
    titleSimilarity,
    titleMismatch: titleSimilarity < 0.62,
  };
}

function buildAuthorshipMetadataPatch(
  source: PaperSourceRow,
  metadata: Record<string, unknown>,
  work: Record<string, unknown>,
  resolution: {
    summary: Record<string, unknown> | null;
  },
) {
  const authors = extractAuthorships(work);
  const extractedOrganizations = uniqueStrings(authors.flatMap(author => author.institutions.map(institution => institution.display_name)));
  const organizations = uniqueStrings([
    ...readStringArray(metadata.organizations),
    ...extractedOrganizations,
  ]);
  const authorNames = authors.map(author => author.display_name).filter(Boolean);
  const now = new Date().toISOString();
  return {
    authors,
    authorNames,
    organizations,
    openalexAuthorships: authors,
    openalexWorkId: readString(metadata.openalexWorkId) || readString(metadata.openalexId) || readString(work.id),
    doi: readString(metadata.doi) || readString(work.doi),
    venue: readString(metadata.venue) || readString(asRecord(asRecord(work.primary_location).source).display_name),
    citationCount: readNumber(metadata.citationCount) ?? readNumber(work.cited_by_count) ?? 0,
    authorshipEnrichedAt: now,
    authorshipSource: {
      provider: 'openalex',
      enrichedBy: 'enrich_paper_authorships',
      sourceItemId: source.id,
      ...resolution.summary,
    },
  };
}

function extractAuthorships(work: Record<string, unknown>) {
  const authorships = Array.isArray(work.authorships) ? work.authorships.map(asRecord) : [];
  return authorships.slice(0, 80).map((authorship, index) => {
    const author = asRecord(authorship.author);
    const institutions = Array.isArray(authorship.institutions)
      ? authorship.institutions.map(asRecord).map(institution => ({
        id: readString(institution.id),
        display_name: readString(institution.display_name) || readString(institution.name) || '',
        ror: readString(institution.ror),
        type: readString(institution.type),
        country_code: readString(institution.country_code),
      })).filter(institution => institution.display_name)
      : [];
    return {
      display_name: readString(author.display_name) || readString(author.name) || '',
      name: readString(author.display_name) || readString(author.name) || '',
      openalexAuthorId: cleanOpenAlexAuthorId(readString(author.id)),
      orcid: readString(author.orcid),
      authorPosition: readString(authorship.author_position),
      position: index + 1,
      isCorresponding: Boolean(authorship.is_corresponding),
      raw_affiliation_strings: readStringArray(authorship.raw_affiliation_strings),
      institutions,
    };
  }).filter(author => author.display_name);
}

function extractWorkArxivIds(work: Record<string, unknown>): string[] {
  const values = [
    readString(work.doi),
    readString(asRecord(work.ids).doi),
  ];
  const locations = Array.isArray(work.locations) ? work.locations.map(asRecord) : [];
  for (const location of locations) {
    values.push(readString(location.landing_page_url));
    values.push(readString(location.pdf_url));
  }
  const primaryLocation = asRecord(work.primary_location);
  const bestLocation = asRecord(work.best_oa_location);
  values.push(readString(primaryLocation.landing_page_url));
  values.push(readString(primaryLocation.pdf_url));
  values.push(readString(bestLocation.landing_page_url));
  values.push(readString(bestLocation.pdf_url));

  return values.map(value => extractArxivId(value)).filter((value): value is string => Boolean(value));
}

function openAlexParams() {
  const params = new URLSearchParams({ mailto: OPENALEX_MAILTO });
  if (process.env.OPENALEX_API_KEY) params.set('api_key', process.env.OPENALEX_API_KEY);
  return params;
}

function redactOpenAlexUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.searchParams.has('api_key')) url.searchParams.set('api_key', '[redacted]');
    return url.toString();
  } catch {
    return value.replace(/([?&]api_key=)[^&]+/i, '$1[redacted]');
  }
}

function dedupeLookupCandidates(candidates: LookupCandidate[]): LookupCandidate[] {
  const seen = new Set<string>();
  return candidates.filter(candidate => {
    const key = `${candidate.kind}:${candidate.url}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function cleanOpenAlexWorkId(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/(?:openalex\.org\/)?(W\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

function cleanOpenAlexAuthorId(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/(?:openalex\.org\/)?(A\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

function normalizeDoi(value: string | null): string | null {
  if (!value) return null;
  const match = value
    .replace(/^https?:\/\/doi\.org\//i, '')
    .replace(/^doi:/i, '')
    .match(/10\.\d{4,9}\/[^\s"'<>]+/i);
  if (!match) return null;
  return match[0]
    .replace(/[).,;]+$/g, '')
    .trim()
    .toLowerCase() || null;
}

function extractArxivId(value: string | null | undefined): string | null {
  if (!value) return null;
  const text = decodeURIComponent(String(value)).trim();
  const arxivUrl = text.match(/arxiv\.org\/(?:abs|pdf|html)\/([^?#\s]+)/i);
  if (arxivUrl) return normalizeArxivId(arxivUrl[1]);
  const doiArxiv = text.match(/10\.48550\/arxiv\.([A-Za-z0-9._/-]+(?:v\d+)?)/i);
  if (doiArxiv) return normalizeArxivId(doiArxiv[1]);
  const labeled = text.match(/arxiv[:.]\s*([A-Za-z0-9._/-]+(?:v\d+)?)/i);
  if (labeled) return normalizeArxivId(labeled[1]);
  return null;
}

function normalizeArxivId(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value
    .trim()
    .replace(/\.pdf$/i, '')
    .replace(/^abs\//i, '')
    .replace(/^pdf\//i, '')
    .replace(/[).,;]+$/g, '');
  const modern = cleaned.match(/^\d{4}\.\d{4,5}(?:v\d+)?$/i);
  const legacy = cleaned.match(/^[a-z-]+(?:\.[A-Z]{2})?\/\d{7}(?:v\d+)?$/i);
  if (!modern && !legacy) return null;
  return cleaned;
}

function stripArxivVersion(value: string | null | undefined): string {
  return (value || '').replace(/v\d+$/i, '').toLowerCase();
}

function compareTitles(left: string, right: string): number {
  const leftTokens = titleTokens(left);
  const rightTokens = titleTokens(right);
  if (leftTokens.length === 0 || rightTokens.length === 0) return 0;
  const rightSet = new Set(rightTokens);
  const overlap = leftTokens.filter(token => rightSet.has(token)).length;
  return overlap / Math.max(Math.min(leftTokens.length, rightTokens.length), 1);
}

function titleTokens(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2);
}

function getDbInfo(): DbInfo {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    return { configured: false, host: null, database: null, local: false, vercel: Boolean(process.env.VERCEL) };
  }
  try {
    const url = new URL(connectionString);
    return {
      configured: true,
      host: url.hostname,
      database: url.pathname.replace(/^\//, '') || null,
      local: ['localhost', '127.0.0.1', '::1'].includes(url.hostname),
      vercel: Boolean(process.env.VERCEL),
    };
  } catch {
    return { configured: true, host: 'unparseable', database: null, local: false, vercel: Boolean(process.env.VERCEL) };
  }
}

function assertWritableDb(db: DbInfo, options: Options) {
  if (!db.configured) throw new Error('DATABASE_URL is not configured.');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to write while NODE_ENV=production.');
  }
  if (process.env.VERCEL && !options.allowVercelEnv) {
    throw new Error('Refusing to write while VERCEL is set. Re-run with --allow-vercel-env after confirming this is the intended dev shell.');
  }
  if (!db.local && !options.allowRemoteDev) {
    throw new Error(`Refusing to write to remote database host "${db.host}". Re-run with --allow-remote-dev after confirming this is a dev database.`);
  }
}

async function withNeonWakeup<T>(action: () => Promise<T>, prisma: { people: { count: () => Promise<number> } }): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (!isNeonResetError(error)) throw error;
    await prisma.people.count();
    return action();
  }
}

function isNeonResetError(error: unknown): boolean {
  const message = errorToSearchableMessage(error);
  return message.includes('ECONNRESET')
    || message.includes('socket hang up')
    || message.includes('Connection terminated unexpectedly')
    || message.includes('fetch failed')
    || message.includes('UND_ERR_SOCKET')
    || message.includes("Can't reach database server")
    || message.includes('P1001');
}

function errorToSearchableMessage(error: unknown): string {
  const values: string[] = [];
  if (error instanceof Error) {
    values.push(error.name, error.message, error.stack || '');
  } else {
    values.push(String(error));
  }

  if (error && typeof error === 'object') {
    const record = error as Record<PropertyKey, unknown>;
    for (const key of ['message', 'code', 'name', 'cause']) {
      const value = record[key];
      if (value) values.push(String(value));
    }
    for (const symbol of Object.getOwnPropertySymbols(error)) {
      const value = record[symbol];
      if (value) values.push(String(value));
    }
  }

  return values.join(' ');
}

function parseArgs(argv: string[]): Options {
  const options: Options = {
    sourceId: null,
    limit: 25,
    execute: false,
    force: false,
    allowRemoteDev: false,
    allowVercelEnv: false,
    help: false,
  };

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--execute') options.execute = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--allow-remote-dev') options.allowRemoteDev = true;
    else if (arg === '--allow-vercel-env') options.allowVercelEnv = true;
    else if (arg.startsWith('--source-id=')) options.sourceId = arg.slice('--source-id='.length);
    else if (arg.startsWith('--limit=')) options.limit = positiveInt(arg.slice('--limit='.length), options.limit);
    else throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function positiveInt(value: string, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const text = typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(text);
  }
  return result;
}

function printHelp() {
  console.log(`
Usage:
  bunx tsx scripts/paper/enrich_paper_authorships.ts --source-id=<rawPoolItemId>
  bunx tsx scripts/paper/enrich_paper_authorships.ts --limit=25
  bunx tsx scripts/paper/enrich_paper_authorships.ts --execute --allow-remote-dev --allow-vercel-env

Default mode is dry-run. It fetches OpenAlex authorships for OpenAlex RawPoolItem papers, validates identity by OpenAlex work id, DOI, arXiv id, or title match, and writes RawPoolItem.metadata.authors/openalexAuthorships only with --execute. It never creates or auto-links People or Organization records.
`);
}
