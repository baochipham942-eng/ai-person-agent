import fs from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

loadEnvFiles();

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');

const sql = neon(process.env.DATABASE_URL);
const EXECUTE = process.argv.includes('--execute');
const VERIFIED_ONLY = process.argv.includes('--verified-only');
const LIMIT = positiveNumber(argValue('--limit'));
const OUT = argValue('--out') || 'docs/audit-2026-06/data/x_handle_backfill_curated_seed_log.json';
const REPORT_OUT = argValue('--report-out') || 'docs/audit-2026-06/X_HANDLE_BACKFILL_CURATED_SEEDS.md';

const SEED_FILES = [
    'scripts/enrich/add_priority_ai_people.ts',
    'scripts/enrich/add_ai_educators.ts',
    'scripts/enrich/update_specific_handles.ts',
];

const VERIFIED_HANDLES: SeedHandle[] = [
    { name: 'Jason Liu', handle: 'jxnlco', sourceFile: 'manual_verified_web', evidenceUrl: 'https://jxnl.co/resume/' },
    { name: 'Hamel Husain', handle: 'HamelHusain', sourceFile: 'manual_verified_web', evidenceUrl: 'https://hamel.dev/' },
    { name: 'Sam Witteveen', handle: 'Sam_Witteveen', sourceFile: 'manual_verified_web', evidenceUrl: 'https://medium.com/@sam_witteveen/activity' },
    { name: 'Jay Alammar', handle: 'JayAlammar', sourceFile: 'manual_verified_web', evidenceUrl: 'https://jalammar.github.io/' },
    { name: 'Lex Fridman', handle: 'lexfridman', sourceFile: 'manual_verified_web', evidenceUrl: 'https://lexfridman.com/' },
    { name: 'Graham Neubig', handle: 'gneubig', sourceFile: 'manual_verified_web', evidenceUrl: 'https://www.phontron.com/' },
    { name: 'Sergey Levine', handle: 'svlevine', sourceFile: 'manual_verified_web', evidenceUrl: 'https://people.eecs.berkeley.edu/~svlevine/' },
    { name: 'Alexander Amini', handle: 'xanamini', sourceFile: 'manual_verified_web', evidenceUrl: 'https://www.mit.edu/~amini/' },
    { name: 'Yann Dubois', handle: 'yanndubs', sourceFile: 'manual_verified_web', evidenceUrl: 'https://yanndubs.github.io/year-archive/' },
    { name: 'Tianqi Chen', handle: 'tqchenml', sourceFile: 'manual_verified_web', evidenceUrl: 'https://tqchen.com/' },
];

interface OfficialLink {
    type?: string;
    platform?: string;
    url?: string;
    handle?: string;
    [key: string]: unknown;
}

interface PersonRow {
    id: string;
    qid: string;
    name: string;
    aliases: string[] | null;
    status: string;
    officialLinks: unknown;
    sourceWhitelist: string[] | null;
}

interface SeedHandle {
    name: string;
    handle: string;
    sourceFile: string;
    evidenceUrl?: string;
}

interface ApplyRow {
    seed: SeedHandle;
    person: PersonRow | null;
    applied: boolean;
    skippedReason: string | null;
    beforeLinks: OfficialLink[];
    afterLinks: OfficialLink[];
}

function argValue(name: string): string | undefined {
    const inline = process.argv.find(arg => arg.startsWith(`${name}=`));
    if (inline) return inline.slice(name.length + 1);
    const index = process.argv.indexOf(name);
    return index >= 0 ? process.argv[index + 1] : undefined;
}

function positiveNumber(value?: string): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

function loadEnvFiles() {
    for (const filename of ['.env', '.env.local', '.env.production']) {
        const envPath = path.join(process.cwd(), filename);
        if (!fs.existsSync(envPath)) continue;

        const content = fs.readFileSync(envPath, 'utf-8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const [key, ...valueParts] = trimmed.split('=');
            if (!key || valueParts.length === 0 || process.env[key.trim()]) continue;

            let value = valueParts.join('=').trim();
            if ((value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            }
            process.env[key.trim()] = value;
        }
    }
}

function normalizeHandle(value?: string | null): string | null {
    const clean = value?.trim().replace(/^@/, '');
    if (!clean || clean === 'null') return null;
    return clean.replace(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//i, '').split(/[/?#]/)[0] || null;
}

function asLinks(value: unknown): OfficialLink[] {
    if (Array.isArray(value)) {
        return value.filter((item): item is OfficialLink => Boolean(item) && typeof item === 'object');
    }

    if (!value || typeof value !== 'object') return [];

    return Object.entries(value as Record<string, unknown>).flatMap(([type, link]) => {
        if (typeof link === 'string') return [{ type, url: link }];
        if (link && typeof link === 'object') return [{ type, ...(link as Record<string, unknown>) }] as OfficialLink[];
        return [];
    });
}

function isXish(link: OfficialLink): boolean {
    const type = String(link.type || link.platform || '').toLowerCase();
    const url = String(link.url || '');
    return type === 'x' || type === 'twitter' || /(?:x|twitter)\.com\//i.test(url);
}

function hasValidXHandle(links: OfficialLink[]): boolean {
    return links.some(link => {
        if (!isXish(link)) return false;
        const handle = normalizeHandle(String(link.handle || link.url || ''));
        return Boolean(handle && !['home', 'i', 'intent', 'share'].includes(handle.toLowerCase()));
    });
}

function unique<T>(values: T[]): T[] {
    return [...new Set(values)];
}

function domainsFromLinks(links: OfficialLink[]): string[] {
    return links.flatMap(link => {
        if (!link.url) return [];
        try {
            return [new URL(link.url).hostname.replace(/^www\./, '').toLowerCase()];
        } catch {
            return [];
        }
    });
}

function extractSeedHandles(): SeedHandle[] {
    const seeds: SeedHandle[] = [];

    for (const sourceFile of SEED_FILES) {
        const absolute = path.join(process.cwd(), sourceFile);
        const content = fs.readFileSync(absolute, 'utf-8');

        for (const match of content.matchAll(/\{\s*name:\s*['"]([^'"]+)['"]\s*,\s*handle:\s*['"](@?[^'"]+)['"]\s*\}/g)) {
            const handle = normalizeHandle(match[2]);
            if (handle) seeds.push({ name: match[1], handle, sourceFile });
        }

        let currentName: string | null = null;
        for (const line of content.split('\n')) {
            const nameMatch = line.match(/^\s*name:\s*['"]([^'"]+)['"]\s*,?\s*$/);
            if (nameMatch) {
                currentName = nameMatch[1];
                continue;
            }

            const handleMatch = line.match(/^\s*xHandle:\s*(['"]([^'"]+)['"]|null)\s*,?\s*$/);
            if (handleMatch && currentName) {
                const handle = normalizeHandle(handleMatch[2]);
                if (handle) seeds.push({ name: currentName, handle, sourceFile });
                continue;
            }

            if (/^\s*}\s*,?\s*$/.test(line)) {
                currentName = null;
            }
        }
    }

    const seen = new Set<string>();
    return seeds.filter(seed => {
        const key = `${seed.name.toLowerCase()}:${seed.handle.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

async function findPerson(seed: SeedHandle): Promise<PersonRow | null> {
    const rows = await sql<PersonRow[]>`
        SELECT id, qid, name, aliases, status, "officialLinks", "sourceWhitelist"
        FROM "People"
        WHERE status IN ('ready', 'active')
          AND (
            lower(name) = lower(${seed.name})
            OR aliases && ${[seed.name]}::text[]
          )
        ORDER BY CASE WHEN lower(name) = lower(${seed.name}) THEN 0 ELSE 1 END, "influenceScore" DESC NULLS LAST
        LIMIT 1
    `;
    return rows[0] || null;
}

function buildPatch(person: PersonRow, seed: SeedHandle) {
    const beforeLinks = asLinks(person.officialLinks);
    const cleanedLinks = beforeLinks.filter(link => !(isXish(link) && !normalizeHandle(String(link.handle || link.url || ''))));
    const xLink: OfficialLink = {
        type: 'x',
        url: `https://x.com/${seed.handle}`,
        handle: `@${seed.handle}`,
        source: 'curated_seed',
        sourceFile: seed.sourceFile,
        evidenceUrl: seed.evidenceUrl,
        fetchedAt: new Date().toISOString(),
    };
    const afterLinks = [...cleanedLinks, xLink];
    const sourceWhitelist = unique([
        ...(person.sourceWhitelist || []),
        ...domainsFromLinks(afterLinks),
    ]);

    return { beforeLinks, afterLinks, sourceWhitelist };
}

function mdEscape(value: unknown): string {
    return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function renderReport(summary: Record<string, unknown>, rows: ApplyRow[]) {
    const lines = [
        '# X Handle Backfill From Curated Seeds',
        '',
        `Generated at: ${summary.generatedAt}`,
        `Mode: ${summary.mode}`,
        '',
        '## Counts',
        '',
        '| Metric | Value |',
        '| --- | ---: |',
        `| seedHandles | ${summary.seedHandles} |`,
        `| matchedPeople | ${summary.matchedPeople} |`,
        `| applicable | ${summary.applicable} |`,
        `| applied | ${summary.applied} |`,
        '',
        '## Rows',
        '',
        '| Seed Person | Matched Person | Handle | Applied | Reason | Source |',
        '| --- | --- | --- | --- | --- | --- |',
        ...rows.map(row => [
            row.seed.name,
            row.person?.name || '',
            `@${row.seed.handle}`,
            row.applied ? 'yes' : 'no',
            row.skippedReason || '',
            row.seed.sourceFile,
        ].map(mdEscape).join(' | ').replace(/^/, '| ').replace(/$/, ' |')),
        '',
    ];
    fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

async function main() {
    const seedHandles = VERIFIED_ONLY ? VERIFIED_HANDLES : extractSeedHandles();
    const selectedSeeds = LIMIT ? seedHandles.slice(0, LIMIT) : seedHandles;
    const rows: ApplyRow[] = [];

    console.log(`X handle backfill from curated seeds | mode=${EXECUTE ? 'execute' : 'dry-run'} | verifiedOnly=${VERIFIED_ONLY ? 'yes' : 'no'} | seeds=${selectedSeeds.length}`);

    for (const seed of selectedSeeds) {
        const person = await findPerson(seed);
        let applied = false;
        let skippedReason: string | null = null;
        let beforeLinks: OfficialLink[] = [];
        let afterLinks: OfficialLink[] = [];

        if (!person) {
            skippedReason = 'missing_person';
        } else {
            beforeLinks = asLinks(person.officialLinks);
            if (hasValidXHandle(beforeLinks)) {
                skippedReason = 'already_has_x_handle';
                afterLinks = beforeLinks;
            } else {
                const patch = buildPatch(person, seed);
                beforeLinks = patch.beforeLinks;
                afterLinks = patch.afterLinks;

                if (EXECUTE) {
                    await sql`
                        UPDATE "People"
                        SET "officialLinks" = ${JSON.stringify(patch.afterLinks)}::jsonb,
                            "sourceWhitelist" = ${patch.sourceWhitelist},
                            "updatedAt" = NOW()
                        WHERE id = ${person.id}
                    `;
                    applied = true;
                }
            }
        }

        rows.push({ seed, person, applied, skippedReason, beforeLinks, afterLinks });
        console.log(`${applied ? 'applied' : EXECUTE ? 'skipped' : skippedReason ? 'skip' : 'would apply'}: ${seed.name} @${seed.handle}${person ? ` -> ${person.name}` : ''}${skippedReason ? ` (${skippedReason})` : ''}`);
    }

    const summary = {
        generatedAt: new Date().toISOString(),
        mode: EXECUTE ? 'execute' : 'dry-run',
        seedHandles: selectedSeeds.length,
        matchedPeople: rows.filter(row => row.person).length,
        applicable: rows.filter(row => row.person && !row.skippedReason).length,
        applied: rows.filter(row => row.applied).length,
        out: OUT,
        reportOut: REPORT_OUT,
    };

    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify({ summary, rows }, null, 2));
    renderReport(summary, rows);
    console.log(JSON.stringify(summary, null, 2));
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
