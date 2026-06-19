import crypto from 'node:crypto';
import * as fs from 'fs';
import * as path from 'path';
import { neon } from '@neondatabase/serverless';
import { fetchXPostsWithXaiSearch, normalizeXHandle } from '../../lib/datasources/xai-x-search';
import { buildRawPoolIdentity, contentHash } from '../../lib/rawpool-identity';

loadEnvFiles();

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const rawSql = neon(process.env.DATABASE_URL);
const sql = <T = unknown>(strings: TemplateStringsArray, ...values: unknown[]) =>
    withRetry(() => rawSql(strings, ...values) as Promise<T[]>, 'database query');
const DEFAULT_LIMIT = 25;
const DEFAULT_MAX_RESULTS = 10;
const DEFAULT_SLEEP_MS = 2000;
const RETRY_ATTEMPTS = 3;
const RETRY_BASE_MS = 1000;

interface XPost {
    id: string;
    text: string;
    date: string;
    url: string;
    author?: string;
}

interface OfficialLink {
    type?: string;
    platform?: string;
    url?: string;
    handle?: string;
}

interface PersonTarget {
    id: string;
    name: string;
    qid: string;
    officialLinks: unknown;
    lastFetchedAt: unknown;
    xCount: number;
    latestXPublishedAt: string | null;
    latestXFetchedAt: string | null;
}

interface CliOptions {
    execute: boolean;
    fetchPreview: boolean;
    includeCandidates: boolean;
    includeExistingX: boolean;
    all: boolean;
    limit: number;
    maxResults: number;
    sleepMs: number;
    person?: string;
    sinceDays?: number;
    staleDays?: number;
    thinCount?: number;
}

interface RefreshStats {
    fetched: number;
    wouldCreate: number;
    wouldUpdate: number;
    created: number;
    updated: number;
    keepAuditsInserted: number;
}

function loadEnvFiles() {
    const mode = process.env.NODE_ENV || 'development';
    const files = ['.env', `.env.${mode}`, '.env.local', `.env.${mode}.local`, '.env.production'];
    const seen = new Set<string>();

    for (const filename of files) {
        if (seen.has(filename)) continue;
        seen.add(filename);

        const envPath = path.join(process.cwd(), filename);
        if (!fs.existsSync(envPath)) continue;

        const allowOverride = filename !== '.env.production' || mode === 'production';
        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            const [key, ...valueParts] = trimmed.split('=');
            if (!key || valueParts.length === 0) continue;
            if (!allowOverride && process.env[key.trim()]) continue;

            let value = valueParts.join('=').trim();
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            process.env[key.trim()] = value;
        }
    }
}

function parseCliOptions(): CliOptions {
    const args = process.argv.slice(2);
    const valueFor = (name: string): string | undefined => {
        const inline = args.find(arg => arg.startsWith(`${name}=`));
        if (inline) return inline.slice(name.length + 1);

        const index = args.indexOf(name);
        return index >= 0 ? args[index + 1] : undefined;
    };

    const limit = Number(valueFor('--limit'));
    const maxResults = Number(valueFor('--max-results'));
    const sleepMs = Number(valueFor('--sleep-ms'));
    const sinceDays = Number(valueFor('--since-days'));
    const staleDays = Number(valueFor('--stale-days'));
    const thinCount = Number(valueFor('--thin-count'));

    return {
        execute: args.includes('--execute'),
        fetchPreview: args.includes('--fetch-preview'),
        includeCandidates: args.includes('--include-candidates'),
        includeExistingX: args.includes('--include-existing-x'),
        all: args.includes('--all'),
        limit: Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_LIMIT,
        maxResults: Number.isFinite(maxResults) && maxResults > 0
            ? Math.min(Math.floor(maxResults), 20)
            : DEFAULT_MAX_RESULTS,
        sleepMs: Number.isFinite(sleepMs) && sleepMs >= 0 ? sleepMs : DEFAULT_SLEEP_MS,
        person: valueFor('--person'),
        sinceDays: Number.isFinite(sinceDays) && sinceDays > 0 ? Math.floor(sinceDays) : undefined,
        staleDays: Number.isFinite(staleDays) && staleDays > 0 ? Math.floor(staleDays) : undefined,
        thinCount: Number.isFinite(thinCount) && thinCount > 0 ? Math.floor(thinCount) : undefined,
    };
}

function normalizeOfficialLinks(value: unknown): OfficialLink[] {
    if (Array.isArray(value)) {
        return value.filter((link): link is OfficialLink => Boolean(link) && typeof link === 'object');
    }

    if (!value || typeof value !== 'object') return [];

    return Object.entries(value as Record<string, unknown>).flatMap(([type, link]) => {
        if (typeof link === 'string') return [{ type, url: link }];
        if (link && typeof link === 'object') return [{ type, ...(link as Record<string, unknown>) }] as OfficialLink[];
        return [];
    });
}

function extractXHandle(officialLinks: unknown): string | null {
    for (const link of normalizeOfficialLinks(officialLinks)) {
        const type = String(link.type || link.platform || '').toLowerCase();
        const url = String(link.url || '');
        if (type !== 'x' && type !== 'twitter' && !/(?:x|twitter)\.com\//i.test(url)) continue;

        const handle = normalizeXHandle(link.handle || url);
        if (handle && !['home', 'i', 'intent', 'share'].includes(handle.toLowerCase())) return handle;
    }

    return null;
}

function sinceDate(days?: number): Date | undefined {
    if (!days) return undefined;
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function toLastFetchedAtObject(value: unknown): Record<string, string> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};

    return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).filter(([, entry]) => typeof entry === 'string')
    ) as Record<string, string>;
}

function parseJsonValue(value: unknown): unknown {
    if (typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch {
        return value;
    }
}

function parseXCount(value: unknown): number {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function parseOptionalIso(value: unknown): string | null {
    if (!value) return null;
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parsePostDate(value: string): Date | null {
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isTransientError(error: unknown): boolean {
    const record = error && typeof error === 'object' ? error as Record<string, unknown> : {};
    const code = String(record.code || record.errno || '');
    const message = String(record.message || error || '');

    return [
        code,
        message,
    ].some(value => /ECONNRESET|ConnectionRefused|Unable to connect|socket connection|fetch failed|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|429|5\d\d/i.test(value));
}

async function withRetry<T>(operation: () => Promise<T>, label: string): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt >= RETRY_ATTEMPTS || !isTransientError(error)) throw error;

            const delay = RETRY_BASE_MS * attempt;
            console.warn(`${label} transient failure, retrying ${attempt}/${RETRY_ATTEMPTS - 1} in ${delay}ms:`, error);
            await sleep(delay);
        }
    }

    throw lastError;
}

async function findPersonTargets(options: CliOptions): Promise<PersonTarget[]> {
    const statuses = options.includeCandidates ? ['ready', 'active', 'candidate'] : ['ready', 'active'];
    const rows = options.person
        ? await sql`
            SELECT p.id, p.qid, p.name, p."officialLinks", p."lastFetchedAt",
                   COUNT(raw.id)::int AS "xCount",
                   MAX(raw."publishedAt") AS "latestXPublishedAt",
                   MAX(raw."fetchedAt") AS "latestXFetchedAt"
            FROM "People" p
            LEFT JOIN "RawPoolItem" raw
              ON raw."personId" = p.id
             AND raw."sourceType" = 'x'
            WHERE p.id = ${options.person}
               OR p.qid = ${options.person}
               OR lower(p.name) = lower(${options.person})
            GROUP BY p.id
            ORDER BY p."influenceScore" DESC NULLS LAST, p.name
        `
        : await sql`
            SELECT p.id, p.qid, p.name, p."officialLinks", p."lastFetchedAt",
                   COUNT(raw.id)::int AS "xCount",
                   MAX(raw."publishedAt") AS "latestXPublishedAt",
                   MAX(raw."fetchedAt") AS "latestXFetchedAt"
            FROM "People" p
            LEFT JOIN "RawPoolItem" raw
              ON raw."personId" = p.id
             AND raw."sourceType" = 'x'
            WHERE p.status = ANY(${statuses}::text[])
            GROUP BY p.id
            ORDER BY p."influenceScore" DESC NULLS LAST, p.name
        `;

    return rows.map(row => ({
        id: String(row.id),
        qid: String(row.qid || ''),
        name: String(row.name),
        officialLinks: parseJsonValue(row.officialLinks),
        lastFetchedAt: parseJsonValue(row.lastFetchedAt),
        xCount: parseXCount(row.xCount),
        latestXPublishedAt: parseOptionalIso(row.latestXPublishedAt),
        latestXFetchedAt: parseOptionalIso(row.latestXFetchedAt),
    }));
}

function isExistingXRefreshTarget(person: PersonTarget, options: CliOptions): boolean {
    if (person.xCount <= 0) return false;

    const thin = Boolean(options.thinCount && person.xCount < options.thinCount);
    const stale = Boolean(options.staleDays && (
        !person.latestXPublishedAt
        || new Date(person.latestXPublishedAt).getTime() < Date.now() - options.staleDays * 24 * 60 * 60 * 1000
    ));

    if (options.thinCount || options.staleDays) return thin || stale;
    return true;
}

async function fetchXPosts(personName: string, options: CliOptions, xHandle?: string): Promise<XPost[]> {
    if (!process.env.XAI_API_KEY) {
        console.error('XAI_API_KEY not configured');
        return [];
    }

    try {
        const result = await withRetry(
            () => fetchXPostsWithXaiSearch({
                query: personName,
                maxResults: options.maxResults,
                xHandle,
                since: sinceDate(options.sinceDays),
            }),
            'xAI X Search'
        );
        return result.posts;
    } catch (error) {
        console.error('Grok API failed:', error);
        return [];
    }
}

async function refreshPersonXContent(person: PersonTarget, options: CliOptions, xHandle: string): Promise<RefreshStats> {
    console.log(`\n=== 刷新: ${person.name} (@${xHandle}) ===`);
    console.log(`  正在抓取新推文... (xHandle: ${xHandle || 'none'})`);
    const posts = await fetchXPosts(person.name, options, xHandle);
    console.log(`  获取到推文: ${posts.length} 条`);

    const stats: RefreshStats = {
        fetched: posts.length,
        wouldCreate: 0,
        wouldUpdate: 0,
        created: 0,
        updated: 0,
        keepAuditsInserted: 0,
    };

    for (const post of posts) {
        const metadata = {
            author: post.author,
            postId: post.id,
        };
        const identity = buildRawPoolIdentity({ personId: person.id, sourceType: 'x', url: post.url, metadata });
        const itemMetadata = { ...metadata, rawPoolCanonicalKey: identity.canonicalKey };
        const itemContentHash = contentHash(post.text || post.url);
        const existingRows = await sql`
            SELECT id
            FROM "RawPoolItem"
            WHERE "urlHash" = ${identity.urlHash}
            LIMIT 1
        `;
        const existing = existingRows.length > 0;

        if (existing) stats.wouldUpdate += 1;
        else stats.wouldCreate += 1;

        if (!options.execute) continue;

        await sql`
            INSERT INTO "RawPoolItem" (
                id, "personId", "sourceType", url, "urlHash", "contentHash", title, text,
                "publishedAt", metadata, "fetchStatus", "fetchedAt", processed
            )
            VALUES (
                ${crypto.randomUUID()}, ${person.id}, ${'x'}, ${post.url}, ${identity.urlHash}, ${itemContentHash},
                ${post.text || `Post by @${post.author}`}, ${post.text}, ${parsePostDate(post.date)},
                ${JSON.stringify(itemMetadata)}::jsonb, ${'success'}, NOW(), ${false}
            )
            ON CONFLICT ("urlHash") DO UPDATE
            SET title = EXCLUDED.title,
                text = EXCLUDED.text,
                metadata = EXCLUDED.metadata,
                "contentHash" = EXCLUDED."contentHash",
                "fetchedAt" = EXCLUDED."fetchedAt",
                "fetchStatus" = EXCLUDED."fetchStatus"
        `;

        if (existing) stats.updated += 1;
        else stats.created += 1;

        const existingKeep = await sql`
            SELECT id
            FROM "QAAuditLog"
            WHERE "personId" = ${person.id}
              AND "urlHash" = ${identity.urlHash}
              AND "sourceType" = 'x'
              AND verdict = 'keep'
            LIMIT 1
        `;

        if (existingKeep.length === 0) {
            await sql`
                INSERT INTO "QAAuditLog" (
                    id, "personId", url, "urlHash", "sourceType", stage, verdict,
                    "aboutPerson", "aiRelevant", quality, reason
                )
                VALUES (
                    ${crypto.randomUUID()}, ${person.id}, ${post.url}, ${identity.urlHash}, ${'x'},
                    ${'x_search_refresh'}, ${'keep'}, ${1}, ${0.8}, ${0.8},
                    ${`Official X post from @${xHandle} fetched via xAI X Search.`}
                )
            `;
            stats.keepAuditsInserted += 1;
        }
    }

    if (options.execute) {
        await sql`
            UPDATE "People"
            SET "lastFetchedAt" = ${JSON.stringify({
                ...toLastFetchedAtObject(person.lastFetchedAt),
                x: new Date().toISOString(),
            })}::jsonb,
                "updatedAt" = NOW()
            WHERE id = ${person.id}
        `;
    }

    console.log(options.execute
        ? `  保存完成: created=${stats.created}, updated=${stats.updated}, keepAuditsInserted=${stats.keepAuditsInserted}`
        : `  dry-run: wouldCreate=${stats.wouldCreate}, wouldUpdate=${stats.wouldUpdate}`);

    posts.slice(0, 3).forEach((p, i) => {
        console.log(`    ${i + 1}. @${p.author}: ${(p.text || '').slice(0, 40)}...`);
        console.log(`       ${p.url}`);
    });

    return stats;
}

async function main() {
    const options = parseCliOptions();
    const shouldFetch = options.execute || options.fetchPreview;
    console.log('=== X 内容补抓 ===');
    console.log(`模式: ${options.execute ? 'execute' : options.fetchPreview ? 'fetch-preview' : 'dry-run plan only'}`);
    console.log(`筛选: ${options.includeExistingX ? '包含已有 X 内容人物' : '只处理缺 X RawPoolItem 的人物'}\n`);

    if (shouldFetch && !process.env.XAI_API_KEY) {
        throw new Error('XAI_API_KEY not configured. Put the official key in env or .env.production.');
    }

    const persons = await findPersonTargets(options);

    const targets = persons
        .map(person => ({ person, xHandle: extractXHandle(person.officialLinks) }))
        .filter((item): item is { person: PersonTarget; xHandle: string } => Boolean(item.xHandle))
        .filter(item => {
            if (options.person) return true;
            if (options.includeExistingX) return isExistingXRefreshTarget(item.person, options);
            return item.person.xCount === 0;
        });

    const selected = options.all ? targets : targets.slice(0, options.limit);
    console.log(`候选人物: ${persons.length}`);
    console.log(`可抓目标: ${targets.length}`);
    console.log(`本次处理: ${selected.length}`);

    for (const { person, xHandle } of selected) {
        console.log(`- ${person.name} @${xHandle} existingX=${person.xCount} latestPublished=${person.latestXPublishedAt || 'none'}`);
    }

    if (!shouldFetch) {
        console.log('\nDry-run 只列计划。加 --fetch-preview 试抓但不写库；加 --execute 才写入。');
        return;
    }

    const totals: RefreshStats = {
        fetched: 0,
        wouldCreate: 0,
        wouldUpdate: 0,
        created: 0,
        updated: 0,
        keepAuditsInserted: 0,
    };

    for (const { person, xHandle } of selected) {
        const stats = await refreshPersonXContent(person, options, xHandle);
        totals.fetched += stats.fetched;
        totals.wouldCreate += stats.wouldCreate;
        totals.wouldUpdate += stats.wouldUpdate;
        totals.created += stats.created;
        totals.updated += stats.updated;
        totals.keepAuditsInserted += stats.keepAuditsInserted;

        await sleep(options.sleepMs);
    }

    console.log('\n=== 完成 ===');
    console.log(JSON.stringify(totals, null, 2));
}

main()
    .catch(error => {
        console.error(error);
        process.exitCode = 1;
    });
