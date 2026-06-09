/**
 * Fetch live official pages for candidate People rows.
 *
 * Default is dry-run. It still performs network fetches, but only --execute
 * writes RawPoolItem/QAAuditLog/avatar/completeness updates.
 */
import 'dotenv/config';
import crypto from 'crypto';
import * as cheerio from 'cheerio';
import { neon } from '@neondatabase/serverless';

type OfficialLink = {
  type: string;
  url: string;
  handle?: string;
  label?: string;
};

type CandidatePerson = {
  id: string;
  name: string;
  status: string;
  officialLinks: OfficialLink[] | null;
  avatarUrl: string | null;
  completeness: number | null;
};

type FetchResult = {
  url: string;
  sourceType: string;
  title: string;
  text: string;
  imageUrl: string | null;
  metadata: Record<string, unknown>;
};

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const INCLUDE_NON_CANDIDATES = args.includes('--include-non-candidates');
const personFilter = args.find(arg => arg.startsWith('--person='))?.slice('--person='.length);
const limitArg = args.find(arg => arg.startsWith('--limit='))?.slice('--limit='.length);
const LIMIT = limitArg ? Number(limitArg) : undefined;

if (!process.env.DATABASE_URL) throw new Error('Missing DATABASE_URL');
const sql = neon(process.env.DATABASE_URL);

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function absoluteUrl(baseUrl: string, imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  const decoded = decodeURIComponent(imageUrl);
  const lower = decoded.toLowerCase();
  const baseHost = new URL(baseUrl).hostname;
  if (
    decoded.includes('<')
    || decoded.includes('>')
    || lower.includes('opengraph')
    || lower.includes('social-thumbnails')
    || lower.includes('page-image')
    || (baseHost === 'github.com' && lower.includes('avatars.githubusercontent.com/u/'))
  ) {
    return null;
  }
  try {
    return new URL(imageUrl, baseUrl).toString();
  } catch {
    return null;
  }
}

function sourceType(link: OfficialLink): string {
  if (link.type === 'github') return 'github';
  return 'official';
}

function shouldFetch(link: OfficialLink): boolean {
  if (!/^https?:\/\//i.test(link.url)) return false;
  if (link.type === 'x' || link.url.includes('x.com/') || link.url.includes('twitter.com/')) return false;
  return true;
}

function isPersonalLink(link: OfficialLink): boolean {
  if (link.type === 'github' && link.handle && !link.handle.includes('/')) return true;
  const label = `${link.label || ''} ${link.url}`.toLowerCase();
  if (label.includes('personal') || label.includes('profile') || label.includes('cmu profile')) return true;
  return /~|\.edu\/~|people|faculty|web\.eecs|cs\.cmu\.edu/i.test(link.url);
}

function extractText($: cheerio.CheerioAPI): string {
  $('script, style, noscript, svg, nav, footer, header').remove();
  const chunks = $('main, article, body')
    .first()
    .find('h1,h2,h3,p,li')
    .map((_, element) => normalizeWhitespace($(element).text()))
    .get()
    .filter(Boolean);

  return [...new Set(chunks)].join('\n').slice(0, 8000);
}

async function fetchPage(person: CandidatePerson, link: OfficialLink): Promise<FetchResult | null> {
  const response = await fetch(link.url, {
    headers: {
      'User-Agent': 'AI-Person-Agent/1.0 candidate-live-fetch',
      Accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) {
    console.log(`fetch failed ${person.name}: ${link.url} status=${response.status}`);
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  const html = await response.text();
  const $ = cheerio.load(html);
  const title = normalizeWhitespace(
    $('meta[property="og:title"]').attr('content')
    || $('title').first().text()
    || `${person.name} live official source`,
  );
  const description = normalizeWhitespace(
    $('meta[name="description"]').attr('content')
    || $('meta[property="og:description"]').attr('content')
    || '',
  );
  const text = extractText($);
  const imageUrl = isPersonalLink(link)
    ? absoluteUrl(link.url, $('meta[property="og:image"]').attr('content') || $('meta[name="twitter:image"]').attr('content') || $('link[rel="image_src"]').attr('href'))
    : null;

  const body = [
    description,
    text,
  ].filter(Boolean).join('\n\n').slice(0, 10000);

  if (body.length < 120) {
    console.log(`skip thin page ${person.name}: ${link.url}`);
    return null;
  }

  return {
    url: link.url,
    sourceType: sourceType(link),
    title,
    text: body,
    imageUrl,
    metadata: {
      seed: 'candidate_live_fetch',
      fetchedLive: true,
      contentType,
      linkType: link.type,
      label: link.label,
      textLength: body.length,
    },
  };
}

async function loadPeople(): Promise<CandidatePerson[]> {
  const rows = await sql`
    SELECT id, name, status, "officialLinks", "avatarUrl", completeness
    FROM "People"
    WHERE (${INCLUDE_NON_CANDIDATES} OR status = ${'candidate'})
      AND (${personFilter || null}::text IS NULL OR name = ${personFilter || null} OR aliases && ${personFilter ? [personFilter] : []}::text[])
    ORDER BY name ASC
  ` as CandidatePerson[];
  return LIMIT ? rows.slice(0, LIMIT) : rows;
}

async function hasAudit(personId: string, urlHash: string): Promise<boolean> {
  const rows = await sql`
    SELECT 1
    FROM "QAAuditLog"
    WHERE "personId" = ${personId} AND "urlHash" = ${urlHash} AND verdict = ${'keep'}
    LIMIT 1
  ` as Array<{ '?column?': number }>;
  return rows.length > 0;
}

async function upsertRawAndAudit(person: CandidatePerson, result: FetchResult): Promise<'inserted' | 'updated'> {
  const urlHash = sha256(`${person.id}:${result.url}`);
  const contentHash = sha256(result.text);
  const existing = await sql`
    SELECT id
    FROM "RawPoolItem"
    WHERE "urlHash" = ${urlHash}
    LIMIT 1
  ` as Array<{ id: string }>;

  if (EXECUTE) {
    await sql`
      INSERT INTO "RawPoolItem" (
        id, "personId", "sourceType", url, "urlHash", "contentHash", title, text,
        "publishedAt", metadata, "fetchStatus", "fetchedAt", processed
      )
      VALUES (
        ${crypto.randomUUID()}, ${person.id}, ${result.sourceType}, ${result.url}, ${urlHash}, ${contentHash},
        ${result.title}, ${result.text}, ${null}, ${JSON.stringify(result.metadata)}::jsonb, ${'success'}, NOW(), ${false}
      )
      ON CONFLICT ("urlHash") DO UPDATE
      SET title = EXCLUDED.title,
          text = EXCLUDED.text,
          metadata = EXCLUDED.metadata,
          "contentHash" = EXCLUDED."contentHash",
          "fetchedAt" = EXCLUDED."fetchedAt",
          "fetchStatus" = EXCLUDED."fetchStatus"
    `;

    if (!(await hasAudit(person.id, urlHash))) {
      await sql`
        INSERT INTO "QAAuditLog" (
          id, "personId", url, "urlHash", "sourceType", stage, verdict,
          "aboutPerson", "aiRelevant", quality, reason
        )
        VALUES (
          ${crypto.randomUUID()}, ${person.id}, ${result.url}, ${urlHash}, ${result.sourceType}, ${'L1'}, ${'keep'},
          ${0.9}, ${0.88}, ${0.76}, ${'live candidate official source fetch'}
        )
      `;
    }
  }

  return existing.length > 0 ? 'updated' : 'inserted';
}

async function updatePersonAfterFetch(person: CandidatePerson, imageUrl: string | null, fetchedCount: number): Promise<boolean> {
  const shouldUpdateAvatar = Boolean(imageUrl && !person.avatarUrl);
  if (EXECUTE) {
    await sql`
      UPDATE "People"
      SET
        "avatarUrl" = CASE
          WHEN COALESCE("avatarUrl", '') = '' THEN ${imageUrl}
          ELSE "avatarUrl"
        END,
        completeness = GREATEST(COALESCE(completeness, 0), ${fetchedCount > 0 ? 45 : 35}),
        "updatedAt" = NOW()
      WHERE id = ${person.id}
    `;
  }
  return shouldUpdateAvatar;
}

async function main() {
  const people = await loadPeople();
  console.log(`Candidate live source fetch mode: ${EXECUTE ? 'execute' : 'dry-run'} | people=${people.length}`);

  let fetched = 0;
  let inserted = 0;
  let updated = 0;
  let failed = 0;
  let avatars = 0;

  for (const person of people) {
    const links = (person.officialLinks || []).filter(shouldFetch);
    let personFetched = 0;
    let personImage: string | null = null;

    for (const link of links) {
      try {
        const result = await fetchPage(person, link);
        if (!result) {
          failed += 1;
          continue;
        }

        fetched += 1;
        personFetched += 1;
        if (!personImage && result.imageUrl) personImage = result.imageUrl;
        const outcome = await upsertRawAndAudit(person, result);
        if (outcome === 'inserted') inserted += 1;
        else updated += 1;
      } catch (error) {
        failed += 1;
        console.log(`fetch error ${person.name}: ${link.url} ${(error as Error).message}`);
      }
    }

    const avatarUpdated = await updatePersonAfterFetch(person, personImage, personFetched);
    if (avatarUpdated) avatars += 1;

    console.log(`${EXECUTE ? 'updated' : 'would update'} ${person.name}: fetched=${personFetched}${avatarUpdated ? ' avatar+1' : ''}`);
  }

  console.log(JSON.stringify({ fetched, inserted, updated, failed, avatars }, null, 2));
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
