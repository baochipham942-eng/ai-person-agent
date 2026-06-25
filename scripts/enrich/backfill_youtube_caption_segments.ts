import { config as loadEnv } from 'dotenv';
import { Prisma } from '@prisma/client';
import type { TranscriptSegment } from '@/lib/datasources/supadata';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', quiet: true });

type PrismaClientInstance = typeof import('@/lib/db/prisma').prisma;
type FetchYoutubeTranscriptSegments = typeof import('@/lib/datasources/supadata').fetchYoutubeTranscriptSegments;

let prisma: PrismaClientInstance | null = null;
let fetchYoutubeTranscriptSegments: FetchYoutubeTranscriptSegments | null = null;

interface Options {
  execute: boolean;
  force: boolean;
  limit: number;
  person?: string;
  lang?: string;
  mode: 'native' | 'generate' | 'auto';
  requestTimeoutMs?: number;
  jobPollMs?: number;
  jobMaxPolls?: number;
}

interface CaptionTarget {
  captionItemId: string;
  personId: string;
  url: string;
  title: string;
  metadata: Record<string, unknown> | null;
  videoId: string;
  sourceItemId: string | null;
  existingSegments: number;
}

async function main() {
  console.log(`[youtube-caption-segments] start ${new Date().toISOString()}`);
  const runtime = await loadRuntime();
  prisma = runtime.prisma;
  fetchYoutubeTranscriptSegments = runtime.fetchYoutubeTranscriptSegments;
  console.log('[youtube-caption-segments] runtime loaded');

  const options = parseArgs(process.argv.slice(2));
  const personId = options.person ? await resolvePersonId(options.person) : null;
  if (options.person && !personId) throw new Error(`找不到人物：${options.person}`);

  const targets = await loadTargets(options, personId);
  console.log(`[youtube-caption-segments] targets loaded: ${targets.length}`);
  const summary = {
    mode: options.execute ? 'execute' : 'dry-run',
    force: options.force,
    supadataMode: options.mode,
    lang: options.lang || null,
    requestedLimit: Number.isFinite(options.limit) ? options.limit : null,
    targets: targets.length,
    existingSegmentTargets: targets.filter(target => target.existingSegments > 0).length,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (!options.execute) {
    printPreview(targets);
    console.log('\nDry-run only. Add --execute to fetch and store transcript segments.');
    return;
  }

  const result = {
    attempted: 0,
    fetched: 0,
    transcriptsUpserted: 0,
    segmentsStored: 0,
    skippedNoSegments: 0,
    skippedUnavailable: 0,
    failed: 0,
  };

  for (const [index, target] of targets.entries()) {
    result.attempted += 1;
    process.stdout.write(`[${index + 1}/${targets.length}] ${target.videoId} ${target.title.slice(0, 80)} ... `);

    try {
      const transcript = await fetchYoutubeTranscriptSegments!(target.url, {
        lang: options.lang,
        mode: options.mode,
        requestTimeoutMs: options.requestTimeoutMs,
        jobPollMs: options.jobPollMs,
        jobMaxPolls: options.jobMaxPolls,
      });

      if (!transcript.available) {
        result.skippedUnavailable += 1;
        await markCaption(target, {
          segmentFetchStatus: transcript.status,
          segmentFetchedAt: new Date().toISOString(),
          segmentFetchMode: options.mode,
        });
        console.log(`skip:${transcript.status}`);
        continue;
      }

      const segments = (transcript.segments || []).filter(segment => segment.text.trim().length > 0);
      if (segments.length === 0) {
        result.skippedNoSegments += 1;
        await markCaption(target, {
          segmentFetchStatus: 'no_segments',
          segmentFetchedAt: new Date().toISOString(),
          segmentFetchMode: options.mode,
          segmentFetchLang: transcript.lang,
        });
        console.log('skip:no_segments');
        continue;
      }

      const now = new Date();
      const segmentsText = serializeTranscriptSegments(segments);

      await prisma!.youTubeTranscript.upsert({
        where: {
          personId_videoId: {
            personId: target.personId,
            videoId: target.videoId,
          },
        },
        create: {
          personId: target.personId,
          videoId: target.videoId,
          url: target.url,
          lang: transcript.lang,
          segmentsText,
          segmentCount: segments.length,
          durationMs: transcriptDurationMs(segments),
          source: 'supadata',
          fetchedAt: now,
          captionItemId: target.captionItemId,
          sourceItemId: target.sourceItemId,
        },
        update: {
          url: target.url,
          lang: transcript.lang,
          segmentsText,
          segmentCount: segments.length,
          durationMs: transcriptDurationMs(segments),
          source: 'supadata',
          fetchedAt: now,
          captionItemId: target.captionItemId,
          sourceItemId: target.sourceItemId,
        },
      });

      await markCaption(target, {
        segmentFetchStatus: 'ok',
        segmentFetchedAt: now.toISOString(),
        segmentFetchMode: options.mode,
        segmentFetchLang: transcript.lang,
        segmentCount: segments.length,
      });

      result.fetched += 1;
      result.transcriptsUpserted += 1;
      result.segmentsStored += segments.length;
      console.log(`ok:${segments.length}`);
    } catch (error) {
      result.failed += 1;
      await markCaption(target, {
        segmentFetchStatus: 'error',
        segmentFetchedAt: new Date().toISOString(),
        segmentFetchMode: options.mode,
        segmentFetchError: (error as Error).message.slice(0, 300),
      });
      console.log(`error:${(error as Error).message.slice(0, 120)}`);
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

async function loadTargets(options: Options, personId: string | null): Promise<CaptionTarget[]> {
  const personClause = personId
    ? Prisma.sql`AND c."personId" = ${personId}`
    : Prisma.empty;
  const missingClause = options.force
    ? Prisma.empty
    : Prisma.sql`AND seg."existingSegments" = 0`;
  const skippedClause = options.force
    ? Prisma.empty
    : Prisma.sql`AND COALESCE(c.metadata->>'segmentFetchStatus', '') NOT IN ('none', 'no_segments')`;
  const limitClause = Number.isFinite(options.limit)
    ? Prisma.sql`LIMIT ${options.limit}`
    : Prisma.empty;

  return prisma!.$queryRaw<CaptionTarget[]>`
    WITH captions AS (
      SELECT
        c.id AS "captionItemId",
        c."personId",
        c.url,
        c.title,
        c.metadata,
        COALESCE(
          NULLIF(c.metadata->>'videoId', ''),
          substring(c.url from '(?:v=|youtu\\.be/|embed/|shorts/|live/)([A-Za-z0-9_-]{6,})')
        ) AS "videoId",
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM "RawPoolItem" source_item
            WHERE source_item.id = NULLIF(c.metadata->>'originalRawPoolItemId', '')
          ) THEN NULLIF(c.metadata->>'originalRawPoolItemId', '')
          ELSE NULL
        END AS "sourceItemId",
        c."publishedAt",
        c."fetchedAt"
      FROM "RawPoolItem" c
      WHERE c."sourceType" = 'youtube'
        AND c.metadata->>'sourceKind' = 'youtube_caption'
        ${personClause}
    )
    SELECT
      c."captionItemId",
      c."personId",
      c.url,
      c.title,
      c.metadata,
      c."videoId",
      c."sourceItemId",
      seg."existingSegments"
    FROM captions c
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS "existingSegments"
      FROM "YouTubeTranscript" s
      WHERE s."personId" = c."personId"
        AND s."videoId" = c."videoId"
    ) seg ON TRUE
    WHERE c."videoId" IS NOT NULL
      ${missingClause}
      ${skippedClause}
    ORDER BY c."publishedAt" DESC NULLS LAST, c."fetchedAt" DESC NULLS LAST, c."captionItemId" ASC
    ${limitClause}
  `;
}

async function markCaption(target: CaptionTarget, patch: Record<string, unknown>) {
  await prisma!.rawPoolItem.update({
    where: { id: target.captionItemId },
    data: {
      metadata: {
        ...(target.metadata || {}),
        ...patch,
      },
    },
  });
}

async function loadRuntime() {
  const [db, supadata] = await Promise.all([
    import('@/lib/db/prisma'),
    import('@/lib/datasources/supadata'),
  ]);
  return {
    prisma: db.prisma,
    fetchYoutubeTranscriptSegments: supadata.fetchYoutubeTranscriptSegments,
  };
}

async function resolvePersonId(value: string): Promise<string | null> {
  const person = await prisma!.people.findFirst({
    where: { OR: [{ id: value }, { name: value }, { aliases: { has: value } }] },
    select: { id: true },
  });
  return person?.id || null;
}

function printPreview(targets: CaptionTarget[]) {
  for (const target of targets.slice(0, 12)) {
    console.log([
      target.videoId,
      target.personId,
      target.existingSegments ? `existing=${target.existingSegments}` : 'missing',
      target.title,
    ].join('\t'));
  }
  if (targets.length > 12) console.log(`... ${targets.length - 12} more`);
}

function parseArgs(args: string[]): Options {
  const options: Options = {
    execute: false,
    force: false,
    limit: Number.POSITIVE_INFINITY,
    mode: 'auto',
  };

  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    const next = () => args[++index];
    if (arg === '--execute') options.execute = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--limit') options.limit = readPositiveInt(next(), 'limit');
    else if (arg.startsWith('--limit=')) options.limit = readPositiveInt(arg.slice('--limit='.length), 'limit');
    else if (arg === '--person') options.person = next();
    else if (arg.startsWith('--person=')) options.person = arg.slice('--person='.length);
    else if (arg === '--lang') options.lang = next();
    else if (arg.startsWith('--lang=')) options.lang = arg.slice('--lang='.length);
    else if (arg === '--mode') options.mode = readMode(next());
    else if (arg.startsWith('--mode=')) options.mode = readMode(arg.slice('--mode='.length));
    else if (arg === '--request-timeout-ms') options.requestTimeoutMs = readPositiveInt(next(), 'request-timeout-ms');
    else if (arg.startsWith('--request-timeout-ms=')) options.requestTimeoutMs = readPositiveInt(arg.slice('--request-timeout-ms='.length), 'request-timeout-ms');
    else if (arg === '--job-poll-ms') options.jobPollMs = readPositiveInt(next(), 'job-poll-ms');
    else if (arg.startsWith('--job-poll-ms=')) options.jobPollMs = readPositiveInt(arg.slice('--job-poll-ms='.length), 'job-poll-ms');
    else if (arg === '--job-max-polls') options.jobMaxPolls = readPositiveInt(next(), 'job-max-polls');
    else if (arg.startsWith('--job-max-polls=')) options.jobMaxPolls = readPositiveInt(arg.slice('--job-max-polls='.length), 'job-max-polls');
    else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function readMode(value: string): Options['mode'] {
  if (value === 'native' || value === 'generate' || value === 'auto') return value;
  throw new Error(`--mode must be native, generate, or auto. Received: ${value}`);
}

function readPositiveInt(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) throw new Error(`--${name} must be a positive integer`);
  return Math.floor(parsed);
}

function serializeTranscriptSegments(segments: TranscriptSegment[]): string {
  return segments
    .map(segment => [
      Math.round(segment.offset),
      segment.duration == null ? '' : Math.round(segment.duration),
      JSON.stringify(segment.text),
    ].join('\t'))
    .join('\n');
}

function transcriptDurationMs(segments: TranscriptSegment[]): number | null {
  let durationMs = 0;
  for (const segment of segments) {
    const endMs = Math.round(segment.offset) + Math.max(0, Math.round(segment.duration || 0));
    if (endMs > durationMs) durationMs = endMs;
  }
  return durationMs || null;
}

function printHelp() {
  console.log(`Usage: npx tsx scripts/enrich/backfill_youtube_caption_segments.ts [options]

Options:
  --execute                 Write compact transcript rows and caption fetch status.
  --limit <n>               Max caption rows to process.
  --force                   Re-fetch rows even when segments already exist.
  --person <id|name|alias>  Limit to one person.
  --lang <code>             Preferred transcript language.
  --mode <mode>             Supadata mode: auto, native, generate. Default: auto.
  --request-timeout-ms <n>  Per HTTP request timeout.
  --job-poll-ms <n>         Async job poll interval.
  --job-max-polls <n>       Async job max polls.
`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
