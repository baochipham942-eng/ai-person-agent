/**
 * YouTube 字幕采集 + 关键词提取核心（A backfill 关键词 + B fetch-new 字幕）。
 * 从 scripts/enrich/fetch_youtube_captions.ts 抽出，CLI 与后台共用。
 */
import { prisma } from '@/lib/db/prisma';
import { buildRawPoolIdentity, contentHash } from '@/lib/rawpool-identity';
import { fetchYoutubeTranscript, SupadataQuotaError } from '@/lib/datasources/supadata';
import { extractContentKeywords } from '@/lib/ai/extract-keywords';
import { makeLogger, type PipelineRunHooks } from './hooks';

export interface YoutubeCaptionsOptions {
  execute: boolean;
  backfillOnly: boolean;
  fetchOnly: boolean;
  limit: number;
  maxSupadata: number;
  lang?: string;
  person?: string;
  skipKeywords: boolean;
  shards: number;
  shardIndex: number;
  quiet: boolean;
}

type YoutubeRow = { id: string; personId: string; url: string; title: string; text: string; metadata: Record<string, unknown> | null; };

function metaRecord(m: unknown): Record<string, unknown> {
  return m && typeof m === 'object' && !Array.isArray(m) ? (m as Record<string, unknown>) : {};
}
function isCaption(row: { metadata: unknown }): boolean {
  return metaRecord(row.metadata).sourceKind === 'youtube_caption';
}
function hasKeywords(row: { metadata: unknown }): boolean {
  const kw = metaRecord(row.metadata).keywords;
  return Array.isArray(kw) && kw.length > 0;
}
function videoIdOf(row: { metadata: unknown; url: string }): string {
  const fromMeta = metaRecord(row.metadata).videoId;
  if (typeof fromMeta === 'string' && fromMeta) return fromMeta;
  const m = row.url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m?.[1] ?? '';
}
function stableShard(value: string, shards: number): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  return hash % shards;
}
export async function resolvePersonId(name: string): Promise<string | null> {
  const p = await prisma.people.findFirst({
    where: { OR: [{ id: name }, { name }, { aliases: { has: name } }] },
    select: { id: true },
  });
  return p?.id ?? null;
}

export async function runYoutubeCaptions(opts: YoutubeCaptionsOptions, hooks: PipelineRunHooks = {}): Promise<{ kwBackfilled: number; captionsFetched: number; supadataCalls: number; quotaHit: boolean }> {
  const log = makeLogger(hooks);
  if (opts.shardIndex >= opts.shards) throw new Error(`--shard-index 必须小于 --shards（当前 ${opts.shardIndex}/${opts.shards}）`);

  const personFilter = opts.person ? await resolvePersonId(opts.person) : null;
  if (opts.person && !personFilter) throw new Error(`找不到人物：${opts.person}`);

  await log('info', `YouTube 字幕采集：${opts.execute ? 'EXECUTE(写库)' : 'DRY-RUN'} | ${opts.backfillOnly ? '仅backfill' : opts.fetchOnly ? '仅fetch-new' : 'backfill+fetch-new'} | Supadata上限=${opts.maxSupadata}${personFilter ? ` | 人物=${opts.person}` : ''}`);

  const baseWhere = { sourceType: 'youtube', ...(personFilter ? { personId: personFilter } : {}) };

  let kwBackfilled = 0;
  let captionsFetched = 0;
  let supadataCalls = 0;
  let skippedNoCaption = 0;
  let quotaHit = false;
  let done = 0;
  let total = 0;

  // ===== A. backfill 关键词 =====
  if (!opts.fetchOnly) {
    const captions = (await prisma.rawPoolItem.findMany({
      where: { ...baseWhere, metadata: { path: ['sourceKind'], equals: 'youtube_caption' } },
      select: { id: true, personId: true, url: true, title: true, text: true, metadata: true },
    })) as YoutubeRow[];
    const need = captions.filter(c => !hasKeywords(c)).slice(0, opts.limit);
    total += need.length;
    await hooks.setTotal?.(total);
    await log('info', `[A] 现有字幕 ${captions.length} 条，缺关键词 ${captions.filter(c => !hasKeywords(c)).length} 条，本轮处理 ${need.length} 条`);

    for (let i = 0; i < need.length; i++) {
      if (await hooks.isCancelled?.()) return { kwBackfilled, captionsFetched, supadataCalls, quotaHit };
      const c = need[i];
      if (!opts.execute) { kwBackfilled++; done++; await hooks.setDone?.(done); continue; }
      try {
        const kw = await extractContentKeywords(c.title, c.text, { contentType: 'YouTube 访谈/分享字幕' });
        await prisma.rawPoolItem.update({
          where: { id: c.id },
          data: { metadata: { ...metaRecord(c.metadata), keywords: kw.keywords, entities: kw.entities, contentTopics: kw.topics, gist: kw.gist } },
        });
        kwBackfilled++;
      } catch (e) {
        await log('warning', `[A] 跳过 ${c.url}: ${(e as Error).message.slice(0, 120)}`);
      }
      done++; await hooks.setDone?.(done);
    }
    await log('info', `[A] 完成：${kwBackfilled} 条字幕${opts.execute ? '已' : '将'}补关键词`);
  }

  // ===== B. fetch-new 字幕 =====
  if (!opts.backfillOnly) {
    const all = await prisma.rawPoolItem.findMany({
      where: baseWhere,
      select: { id: true, personId: true, url: true, title: true, metadata: true },
    });
    const captionedKeys = new Set(all.filter(isCaption).map(r => `${r.personId}:${videoIdOf(r)}`));
    let skippedMarked = 0;
    let videosMissing = all.filter(r => {
      if (isCaption(r)) return false;
      const vid = videoIdOf(r);
      if (!vid) return false;
      if (captionedKeys.has(`${r.personId}:${vid}`)) return false;
      if (metaRecord(r.metadata).captionFetchStatus === 'none') { skippedMarked++; return false; }
      return true;
    });
    if (opts.shards > 1) {
      videosMissing = videosMissing.filter(r => stableShard(`${r.personId}:${videoIdOf(r)}`, opts.shards) === opts.shardIndex);
    }
    await log('info', `[B] 视频总数 ${all.filter(r => !isCaption(r)).length}，缺字幕 ${videosMissing.length} 个（另 ${skippedMarked} 个已确认无字幕跳过）`);

    const budget = Math.min(videosMissing.length, opts.limit, opts.maxSupadata);
    const targets = videosMissing.slice(0, budget);
    total += targets.length;
    await hooks.setTotal?.(total);
    await log('info', `[B] 本轮尝试 ${targets.length} 个（受 limit/max-supadata 约束）`);

    for (let i = 0; i < targets.length; i++) {
      if (await hooks.isCancelled?.()) return { kwBackfilled, captionsFetched, supadataCalls, quotaHit };
      const v = targets[i];
      const vid = videoIdOf(v);
      if (!opts.execute) { captionsFetched++; done++; await hooks.setDone?.(done); continue; }

      let transcript;
      try {
        supadataCalls++;
        transcript = await fetchYoutubeTranscript(v.url, { lang: opts.lang });
      } catch (e) {
        if (e instanceof SupadataQuotaError) {
          quotaHit = true;
          await log('warning', `Supadata 额度耗尽：${e.message}`);
          break;
        }
        await log('warning', `[B] 字幕请求失败 ${v.url}: ${(e as Error).message.slice(0, 120)}`);
        done++; await hooks.setDone?.(done);
        continue;
      }

      if (!transcript.available || transcript.text.length < 50) {
        skippedNoCaption++;
        if (transcript.status === 'none' || (transcript.status === 'ok' && transcript.text.length < 50)) {
          try {
            await prisma.rawPoolItem.update({
              where: { id: v.id },
              data: { metadata: { ...metaRecord(v.metadata), captionFetchStatus: 'none', captionCheckedAt: new Date().toISOString() } },
            });
          } catch { /* 标记失败无所谓，下轮重试 */ }
        }
        done++; await hooks.setDone?.(done);
        continue;
      }

      let kw = { keywords: [] as string[], entities: [] as string[], topics: [] as string[], gist: '' };
      if (!opts.skipKeywords) {
        try {
          kw = await extractContentKeywords(v.title, transcript.text, { contentType: 'YouTube 访谈/分享字幕' });
        } catch (e) {
          await log('warning', `[B] 关键词提取失败（仍落字幕）${v.url}: ${(e as Error).message.slice(0, 80)}`);
        }
      }

      const captionMeta = {
        ...metaRecord(v.metadata),
        sourceKind: 'youtube_caption',
        videoId: vid,
        lang: transcript.lang,
        availableLangs: transcript.availableLangs,
        captionSource: 'supadata',
        originalRawPoolItemId: v.id,
        importedAt: new Date().toISOString(),
        keywords: kw.keywords,
        entities: kw.entities,
        contentTopics: kw.topics,
        gist: kw.gist,
      };
      const identity = buildRawPoolIdentity({ personId: v.personId, sourceType: 'youtube', url: v.url, metadata: captionMeta });
      const title = v.title.startsWith('YouTube 字幕：') ? v.title : `YouTube 字幕：${v.title}`;

      try {
        await prisma.rawPoolItem.upsert({
          where: { urlHash: identity.urlHash },
          create: {
            personId: v.personId,
            sourceType: 'youtube',
            url: v.url,
            urlHash: identity.urlHash,
            contentHash: contentHash(transcript.text),
            title,
            text: transcript.text,
            publishedAt: new Date(),
            metadata: { ...captionMeta, rawPoolCanonicalKey: identity.canonicalKey },
            fetchStatus: 'success',
            fetchedAt: new Date(),
          },
          update: {
            text: transcript.text,
            contentHash: contentHash(transcript.text),
            metadata: { ...captionMeta, rawPoolCanonicalKey: identity.canonicalKey },
            fetchedAt: new Date(),
          },
        });
      } catch (e) {
        await log('warning', `[B] 落库失败（跳过，可重跑补）${v.url}: ${(e as Error).message.slice(0, 100)}`);
        done++; await hooks.setDone?.(done);
        continue;
      }
      captionsFetched++;
      done++; await hooks.setDone?.(done);
    }
    await log('info', `[B] 完成：${captionsFetched} 条字幕${opts.execute ? '已' : '将'}采集，无字幕跳过 ${skippedNoCaption}，Supadata 调用 ${supadataCalls}`);
  }

  await log('info', `汇总：关键词补全 ${kwBackfilled} | 新采集字幕 ${captionsFetched} | Supadata 调用 ${supadataCalls}/${opts.maxSupadata}${quotaHit ? ' | ⚠️ 额度耗尽' : ''}`);
  return { kwBackfilled, captionsFetched, supadataCalls, quotaHit };
}
