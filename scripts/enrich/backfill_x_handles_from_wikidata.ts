import fs from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

loadEnvFiles();

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');

const sql = neon(process.env.DATABASE_URL);
const EXECUTE = process.argv.includes('--execute');
const ALL = process.argv.includes('--all');
const LIMIT = positiveNumber(argValue('--limit')) || 25;
const SLEEP_MS = positiveNumber(argValue('--sleep-ms')) ?? 250;
const OUT = argValue('--out') || 'docs/audit-2026-06/data/x_handle_backfill_wikidata_log.json';
const REPORT_OUT = argValue('--report-out') || 'docs/audit-2026-06/X_HANDLE_BACKFILL_WIKIDATA.md';

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
    status: string;
    influenceScore: number | null;
    officialLinks: unknown;
    sourceWhitelist: string[] | null;
}

interface BackfillRow {
    person: Pick<PersonRow, 'id' | 'qid' | 'name' | 'status' | 'influenceScore'>;
    handle: string | null;
    url: string | null;
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
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
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

function normalizeHandle(value?: string | null): string | null {
    const clean = value?.trim().replace(/^@/, '');
    if (!clean) return null;
    return clean.replace(/^https?:\/\/(?:www\.)?(?:x|twitter)\.com\//i, '').split(/[/?#]/)[0] || null;
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

function unique(values: Array<string | null | undefined>): string[] {
    return [...new Set(values.filter((value): value is string => Boolean(value && value.trim())).map(value => value.trim()))];
}

async function fetchWikidataTwitterHandle(qid: string): Promise<string | null> {
    if (!/^Q\d+$/.test(qid)) return null;

    const params = new URLSearchParams({
        action: 'wbgetentities',
        ids: qid,
        props: 'claims',
        format: 'json',
        origin: '*',
    });

    const response = await fetch(`https://www.wikidata.org/w/api.php?${params}`, {
        headers: { 'User-Agent': 'AI-Person-Agent/1.0 X-handle-backfill' },
    });
    if (!response.ok) throw new Error(`Wikidata error ${response.status}`);

    const data = await response.json();
    const claims = data.entities?.[qid]?.claims?.P2002 || [];
    const claim = claims.find((entry: any) => entry?.rank === 'preferred')
        || claims.find((entry: any) => entry?.rank !== 'deprecated');
    const value = claim?.mainsnak?.datavalue?.value;
    return normalizeHandle(typeof value === 'string' ? value : null);
}

function withBackfilledXLink(person: PersonRow, handle: string): {
    officialLinks: OfficialLink[];
    sourceWhitelist: string[];
} {
    const existingLinks = asLinks(person.officialLinks);
    const cleanedLinks = existingLinks.filter(link => !(isXish(link) && !normalizeHandle(String(link.handle || link.url || ''))));
    const xLink = {
        type: 'x',
        url: `https://x.com/${handle}`,
        handle: `@${handle}`,
        source: 'wikidata',
        wikidataProperty: 'P2002',
        fetchedAt: new Date().toISOString(),
    };
    const officialLinks = [...cleanedLinks, xLink];
    const sourceWhitelist = unique([
        ...(person.sourceWhitelist || []),
        ...domainsFromLinks(officialLinks),
    ]);

    return { officialLinks, sourceWhitelist };
}

function mdEscape(value: unknown): string {
    return String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}

function renderReport(summary: Record<string, unknown>, rows: BackfillRow[]) {
    const lines = [
        '# X Handle Backfill From Wikidata',
        '',
        `Generated at: ${summary.generatedAt}`,
        `Mode: ${summary.mode}`,
        '',
        '## Counts',
        '',
        '| Metric | Value |',
        '| --- | ---: |',
        `| considered | ${summary.considered} |`,
        `| found | ${summary.found} |`,
        `| applied | ${summary.applied} |`,
        `| skipped | ${summary.skipped} |`,
        '',
        '## Rows',
        '',
        '| Person | Status | QID | Handle | Applied | Reason |',
        '| --- | --- | --- | --- | --- | --- |',
        ...rows.map(row => [
            row.person.name,
            row.person.status,
            row.person.qid,
            row.handle ? `@${row.handle}` : '',
            row.applied ? 'yes' : 'no',
            row.skippedReason || '',
        ].map(mdEscape).join(' | ').replace(/^/, '| ').replace(/$/, ' |')),
        '',
    ];
    fs.writeFileSync(REPORT_OUT, `${lines.join('\n')}\n`);
}

async function main() {
    const people = await sql<PersonRow[]>`
        SELECT id, qid, name, status, "influenceScore", "officialLinks", "sourceWhitelist"
        FROM "People"
        WHERE status IN ('ready', 'active')
        ORDER BY "influenceScore" DESC NULLS LAST, name
    `;
    const targets = people
        .filter(person => !hasValidXHandle(asLinks(person.officialLinks)))
        .slice(0, ALL ? undefined : LIMIT);

    console.log(`X handle backfill from Wikidata | mode=${EXECUTE ? 'execute' : 'dry-run'} | targets=${targets.length}`);

    const rows: BackfillRow[] = [];
    for (const person of targets) {
        let handle: string | null = null;
        let skippedReason: string | null = null;
        const beforeLinks = asLinks(person.officialLinks);
        let afterLinks = beforeLinks;
        let applied = false;

        try {
            handle = await fetchWikidataTwitterHandle(person.qid);
            if (!handle) {
                skippedReason = 'wikidata_p2002_missing';
            } else {
                const patch = withBackfilledXLink(person, handle);
                afterLinks = patch.officialLinks;
                if (EXECUTE) {
                    await sql`
                        UPDATE "People"
                        SET "officialLinks" = ${JSON.stringify(patch.officialLinks)}::jsonb,
                            "sourceWhitelist" = ${patch.sourceWhitelist},
                            "updatedAt" = NOW()
                        WHERE id = ${person.id}
                    `;
                    applied = true;
                }
            }
        } catch (error) {
            skippedReason = `error:${String((error as Error).message || error).slice(0, 120)}`;
        }

        rows.push({
            person: {
                id: person.id,
                qid: person.qid,
                name: person.name,
                status: person.status,
                influenceScore: person.influenceScore,
            },
            handle,
            url: handle ? `https://x.com/${handle}` : null,
            applied,
            skippedReason,
            beforeLinks,
            afterLinks,
        });

        console.log(`${handle ? (EXECUTE ? 'applied' : 'would apply') : 'missing'}: ${person.name}${handle ? ` @${handle}` : ` (${skippedReason})`}`);
        await new Promise(resolve => setTimeout(resolve, SLEEP_MS));
    }

    const summary = {
        generatedAt: new Date().toISOString(),
        mode: EXECUTE ? 'execute' : 'dry-run',
        considered: targets.length,
        found: rows.filter(row => row.handle).length,
        applied: rows.filter(row => row.applied).length,
        skipped: rows.filter(row => !row.handle).length,
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
