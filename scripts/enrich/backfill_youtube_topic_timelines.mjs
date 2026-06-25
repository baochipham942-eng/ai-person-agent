import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { config as loadEnv, parse as parseEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';

loadEnv({ path: '.env', quiet: true });
loadEnv({ path: '.env.local', quiet: true });
loadExtraEnv(path.join(os.homedir(), '.code-agent/.env'));
extendDatabaseConnectTimeout();

const prisma = new PrismaClient();

const MIMO_BASE_URL = 'https://token-plan-sgp.xiaomimimo.com/v1';
const DEFAULT_MIMO_MODEL = 'mimo-v2.5-pro';
const MINIMAX_BASE_URL = 'https://api.minimaxi.com/v1';
const DEFAULT_MINIMAX_MODEL = 'MiniMax-M2.7';
const DEFAULT_BATCH_MAX_BLOCKS = 24;
const DEFAULT_BATCH_MAX_CHARS = 18_000;
const DEFAULT_TOPIC_OUTPUT_LIMIT = 24;
const DEFAULT_DISPLAY_TOPIC_LIMIT = 10;
const HARD_DISPLAY_TOPIC_LIMIT = 12;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const providerConfig = resolveTopicProvider(options);
  if (options.execute && providerConfig.transport === 'http' && !providerConfig.apiKey) {
    throw new Error(`Missing ${providerConfig.apiKeyName}. Expected it in .env.local or ~/.code-agent/.env.`);
  }

  const targets = await loadTargets(options);
  console.log(JSON.stringify({
    mode: options.execute ? 'execute' : 'dry-run',
    force: options.force,
    limit: options.limit,
    sourceId: options.sourceId || null,
    includeCaptionItems: options.includeCaptionItems,
    provider: providerConfig.id,
    transport: providerConfig.transport,
    shardIndex: options.shardIndex,
    shardCount: options.shardCount,
    targets: targets.length,
    model: providerConfig.model,
  }, null, 2));

  if (!options.execute) {
    for (const target of targets.slice(0, 10)) {
      console.log(`[preview] ${target.source.id} ${target.videoId} ${target.source.title}`);
    }
    console.log(`Dry-run only. Add --execute to generate and store ${providerConfig.displayName} topic timelines.`);
    return;
  }

  const result = {
    attempted: 0,
    stored: 0,
    skippedNoSegments: 0,
    skippedNoTopics: 0,
    failed: 0,
  };

  for (const [index, target] of targets.entries()) {
    result.attempted += 1;
    process.stdout.write(`[${index + 1}/${targets.length}] ${target.videoId} ${target.source.title.slice(0, 90)} ... `);
    try {
      const segments = parseYoutubeTranscriptSegments(target.transcript.segmentsText);
      if (segments.length === 0) {
        result.skippedNoSegments += 1;
        console.log('skip:no_segments');
        continue;
      }

      const topics = await extractTopicsWithMimo({
        title: target.source.title,
        videoId: target.videoId,
        personName: target.person.name,
        personTitle: target.person.currentTitle,
        tags: uniqueStrings([
          ...arrayValue(target.source.metadata, 'tags'),
          ...arrayValue(target.source.metadata, 'contentTopics'),
          ...target.person.topics,
        ]),
        segments,
        providerConfig,
      });

      if (topics.length === 0) {
        const fallbackTopic = buildFallbackTopic(target.source.title, segments);
        if (!fallbackTopic) {
          result.skippedNoTopics += 1;
          console.log('skip:no_topics');
          continue;
        }
        topics.push(fallbackTopic);
      }

      const now = new Date().toISOString();
      await updateRawPoolItemMetadataWithRetry({
        where: { id: target.source.id },
        data: {
          metadata: {
            ...plainRecord(target.source.metadata),
            [providerConfig.timelineKey]: topics,
            topicTimelineGeneratedAt: now,
            topicTimelineProvider: providerConfig.id,
            topicTimelineModel: providerConfig.model,
            topicTimelineVersion: `${providerConfig.id}-youtube-v1`,
            topicTimelineSource: 'scripts/enrich/backfill_youtube_topic_timelines.mjs',
          },
        },
      });

      result.stored += 1;
      console.log(`ok:${topics.length}`);
    } catch (error) {
      result.failed += 1;
      console.log(`error:${String(error?.message || error).slice(0, 180)}`);
    }
  }

  console.log(JSON.stringify(result, null, 2));
}

async function updateRawPoolItemMetadataWithRetry(args) {
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.rawPoolItem.update(args);
    } catch (error) {
      lastError = error;
      if (attempt < 2) await sleep(1000 * (attempt + 1));
    }
  }
  throw lastError;
}

async function loadTargets(options) {
  if (options.sourceId) {
    const source = await prisma.rawPoolItem.findUnique({
      where: { id: options.sourceId },
      select: sourceSelect(),
    });
    if (!source || source.sourceType !== 'youtube') throw new Error(`YouTube source not found: ${options.sourceId}`);
    if (!options.force && hasPersistedTimeline(source.metadata)) return [];
    const videoId = readString(source.metadata?.videoId) || extractYouTubeVideoId(source.url);
    if (!videoId) throw new Error(`Unable to resolve videoId for ${source.id}`);
    const transcript = await prisma.youTubeTranscript.findFirst({
      where: {
        personId: source.personId,
        OR: [
          { sourceItemId: source.id },
          ...(options.includeCaptionItems ? [{ captionItemId: source.id }] : []),
          ...(options.includeCaptionItems && videoId ? [{ videoId }] : []),
        ],
      },
      orderBy: { fetchedAt: 'desc' },
    });
    if (!transcript) return [];
    return [{ source, transcript, videoId, person: source.person }];
  }

  const transcripts = await prisma.youTubeTranscript.findMany({
    where: { sourceItemId: { not: null } },
    select: {
      id: true,
      personId: true,
      videoId: true,
      url: true,
      lang: true,
      segmentCount: true,
      durationMs: true,
      sourceItemId: true,
      fetchedAt: true,
      sourceItem: {
        select: sourceSelect(),
      },
    },
    orderBy: { fetchedAt: 'desc' },
    take: options.scanLimit,
  });

  const targets = [];
  let missingIndex = 0;
  for (const transcript of transcripts) {
    const source = transcript.sourceItem;
    if (!source || source.sourceType !== 'youtube') continue;
    if (!options.force && hasPersistedTimeline(source.metadata)) continue;
    const shardIndex = missingIndex % options.shardCount;
    missingIndex += 1;
    if (shardIndex !== options.shardIndex) continue;
    const videoId = transcript.videoId || readString(source.metadata?.videoId) || extractYouTubeVideoId(source.url);
    if (!videoId) continue;
    const fullTranscript = await prisma.youTubeTranscript.findUnique({
      where: { id: transcript.id },
      select: {
        id: true,
        personId: true,
        videoId: true,
        url: true,
        lang: true,
        segmentsText: true,
        segmentCount: true,
        durationMs: true,
        sourceItemId: true,
        fetchedAt: true,
      },
    });
    if (!fullTranscript) continue;
    targets.push({ source, transcript: fullTranscript, videoId, person: source.person });
    if (targets.length >= options.limit) break;
  }
  return targets;
}

function sourceSelect() {
  return {
    id: true,
    personId: true,
    sourceType: true,
    title: true,
    url: true,
    metadata: true,
    person: {
      select: {
        name: true,
        currentTitle: true,
        topics: true,
      },
    },
  };
}

async function extractTopicsWithMimo(input) {
  const sourceBlocks = buildMimoTopicInputBlocks(input.segments);
  if (sourceBlocks.length === 0) return [];

  const batches = splitTopicBlocksForMimo(sourceBlocks);
  const drafts = [];
  for (const [batchIndex, batch] of batches.entries()) {
    const raw = await callMimoJson(
      buildMimoWindowTopicMessages(input, batch, {
        batchIndex,
        totalBatches: batches.length,
        totalBlocks: sourceBlocks.length,
      }),
      input.providerConfig,
    );
    drafts.push(...normalizeMimoTopicDrafts(raw, batch, batchIndex));
  }

  let finalDrafts = drafts;
  const shouldMerge = drafts.length > HARD_DISPLAY_TOPIC_LIMIT || batches.length > 1;
  if (drafts.length > 0 && shouldMerge) {
    try {
      const raw = await callMimoJson(
        buildMimoMergeTopicMessages(input, sourceBlocks, drafts),
        input.providerConfig,
      );
      const merged = normalizeMimoTopicDrafts(raw, sourceBlocks, null, HARD_DISPLAY_TOPIC_LIMIT);
      if (merged.length > 0) finalDrafts = merged;
    } catch (error) {
      if (drafts.length <= HARD_DISPLAY_TOPIC_LIMIT) {
        finalDrafts = drafts;
      } else {
      throw new Error(`${input.providerConfig.displayName} display-topic merge failed; refusing to store ${drafts.length} window topics: ${String(error?.message || error).slice(0, 180)}`);
      }
    }
  }

  if (finalDrafts.length > HARD_DISPLAY_TOPIC_LIMIT) {
    throw new Error(`${input.providerConfig.displayName} returned ${finalDrafts.length} display topics; expected at most ${HARD_DISPLAY_TOPIC_LIMIT}`);
  }

  return mapDraftsToPersistedTopics(finalDrafts, sourceBlocks, input.segments);
}

async function callMimoJson(messages, providerConfig, withResponseFormat = true) {
  if (providerConfig.transport === 'mmx') {
    return callMmxJson(messages, providerConfig);
  }

  const baseUrl = providerConfig.baseUrl;
  const tokenField = providerConfig.id === 'mimo' ? 'max_completion_tokens' : 'max_tokens';
  const requestBody = {
    model: providerConfig.model,
    messages,
    temperature: 0,
    top_p: 0.95,
    [tokenField]: positiveIntEnv('TOPIC_MAX_TOKENS', 4096, 1024, 16_384),
    ...(providerConfig.id === 'mimo' ? { thinking: { type: 'disabled' } } : {}),
    ...(withResponseFormat ? { response_format: { type: 'json_object' } } : {}),
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${providerConfig.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: AbortSignal.timeout(positiveIntEnv('TOPIC_TIMEOUT_MS', 180_000, 5_000, 300_000)),
  });

  const responseText = await response.text();
  if (!response.ok) {
    if (withResponseFormat && (response.status === 400 || response.status === 422)) {
      return callMimoJson(messages, providerConfig, false);
    }
    throw new Error(`${providerConfig.displayName} request failed: HTTP ${response.status} ${responseText.slice(0, 500)}`);
  }

  const payload = JSON.parse(responseText);
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${providerConfig.displayName} response missing content: ${responseText.slice(0, 500)}`);
  return extractJsonObject(content);
}

async function callMmxJson(messages, providerConfig) {
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await callMmxJsonOnce(attempt === 0 ? messages : retryMessages(messages), providerConfig);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

async function callMmxJsonOnce(messages, providerConfig) {
  const timeoutMs = positiveIntEnv('TOPIC_TIMEOUT_MS', 180_000, 5_000, 300_000);
  const args = [
    'text',
    'chat',
    '--model',
    providerConfig.model,
    '--region',
    providerConfig.region,
    '--messages-file',
    '-',
    '--output',
    'json',
    '--quiet',
    '--non-interactive',
    '--timeout',
    String(Math.ceil(timeoutMs / 1000)),
  ];
  const payload = JSON.stringify(messages);
  const childEnv = { ...process.env };
  delete childEnv.MINIMAX_API_KEY;
  delete childEnv.MINIMAX_GROUP_ID;
  const result = await runProcess('mmx', args, payload, timeoutMs + 5_000, childEnv);
  if (result.code !== 0) {
    const detail = (result.stderr || result.stdout).slice(0, 500);
    throw new Error(`${providerConfig.displayName} CLI request failed: exit ${result.code} ${detail}`);
  }

  let parsed;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    return extractJsonObject(result.stdout);
  }
  if (parsed?.error) {
    throw new Error(`${providerConfig.displayName} CLI request failed: ${JSON.stringify(parsed.error).slice(0, 500)}`);
  }
  if (Array.isArray(parsed) || parsed?.topics) return parsed;

  const content = parsed?.choices?.[0]?.message?.content
    ?? parsed?.message?.content
    ?? parsed?.content
    ?? parsed?.text
    ?? (typeof parsed === 'string' ? parsed : null);
  if (!content) throw new Error(`${providerConfig.displayName} CLI response missing content: ${result.stdout.slice(0, 500)}`);
  return extractJsonObject(String(content));
}

function retryMessages(messages) {
  return [
    ...messages,
    {
      role: 'user',
      content: '上一次输出无法解析为合法 JSON。请重新输出同一个任务的结果，只输出合法 JSON 对象或数组，不要 markdown 围栏，不要解释，字符串内部必须正确转义。',
    },
  ];
}

function runProcess(command, args, stdin, timeoutMs, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env,
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', error => {
      clearTimeout(timer);
      reject(error);
    });
    child.on('close', code => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
    child.stdin.end(stdin);
  });
}

function buildMimoWindowTopicMessages(input, blocks, context) {
  return [
    {
      role: 'system',
      content: [
        '你是视频内容编辑，负责把长视频字幕提炼成真正的主题章节。',
        '必须审阅输入中的每一个字幕块，不能只挑前几段或精彩片段。',
        '只能根据输入的字幕块做判断，不要引入外部知识。',
        '不要按固定时间、固定数量或平均长度切分；边界必须来自语义变化。',
        '主题标题要概括这一段真正讨论的议题，不要复读字幕开头。',
        '只输出 JSON，不要 markdown，不要解释。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        schema: 'VideoTopicWindowTimeline',
        video: videoPayload(input),
        window: {
          index: context.batchIndex + 1,
          totalWindows: context.totalBatches,
          totalSourceBlocks: context.totalBlocks,
          startBlockId: blocks[0]?.id,
          endBlockId: blocks[blocks.length - 1]?.id,
          time: blocks.length > 0
            ? `${formatTranscriptTime(blocks[0].startMs)}-${formatTranscriptTime(blocks[blocks.length - 1].endMs)}`
            : null,
        },
        outputShape: topicOutputShape(),
        requirements: [
          '这是连续长字幕里的一个技术窗口，窗口边界不代表主题边界。',
          '返回覆盖本窗口全部有信息量字幕的主题章节，不要只总结开头。',
          '如果本窗口后段是重复、回顾、转场或低信息内容，也要并入相邻主题或单独标成对应语义。',
          '每个主题必须是语义章节，不要为了平均时长而硬切。',
          '每个主题必须使用本窗口 input.blocks 中存在的 startBlockId/endBlockId。',
          '主题按出现顺序排列，不能互相重叠。',
          '本窗口通常返回 1-6 个主题；内容明显复杂时可以更多。',
          'title 不要写“开场与背景/核心问题/关键思路”这类模板标签，除非字幕真的在讲这些词。',
          'summary 要具体到内容，不要写“这一段介绍相关内容”。',
        ],
        blocks: blocks.map(blockPayload),
      }),
    },
  ];
}

function buildMimoMergeTopicMessages(input, blocks, drafts) {
  return [
    {
      role: 'system',
      content: [
        '你是长视频章节总编，负责把每个字幕窗口的局部主题合并成全片时间线。',
        '只能根据输入的字幕块和局部主题做判断。',
        '不要按固定时间切分；相邻窗口中语义连续的主题必须合并。',
        '只输出 JSON，不要 markdown，不要解释。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        schema: 'VideoTopicTimelineMerge',
        video: videoPayload(input),
        outputShape: topicOutputShape(),
        requirements: [
          `输出 ${DEFAULT_DISPLAY_TOPIC_LIMIT} 个左右的全片一级主题；短视频可以更少，最长也不能超过 ${HARD_DISPLAY_TOPIC_LIMIT} 个。`,
          '主题必须按出现顺序排列，不能重叠，边界必须使用 input.blocks 中存在的 block id。',
          '这是展示给用户点击导航的一级章节，不要输出二级主题、children、细分步骤或窗口级碎片。',
          '这些主题是整条视频的连续章节，不是高光摘选；必须覆盖从第一个 localTopic 到最后一个 localTopic 的全部信息量内容。',
          '每个输出主题必须由若干个连续 localTopics 合并而来，不能跳过中间 localTopics。',
          '除非 localTopic 明确是片头、空白、广告、口误或纯转场，否则不能丢弃。',
          '相邻输出主题之间不要留下大段时间空白；后一主题的 startBlockId 应该接近前一主题的 endBlockId 之后。',
          '合并重复、过细或跨窗口连续的主题；只有目标、实现阶段、概念对象或实验结论发生明显变化才切主题。',
          '每个主题最好覆盖 2-8 分钟；除开场和结论外，不要输出几十秒的短主题。',
          '连续讲同一段代码实现、同一组参数、同一个训练环节时必须合并。',
          '不要为了覆盖片头、片尾或空泛转场强行创建主题。',
          'summary 必须具体说明这一章帮助用户导航到什么内容。',
        ],
        localTopics: drafts.map(draft => ({
          title: draft.title,
          summary: draft.summary,
          startBlockId: draft.startBlockId,
          endBlockId: draft.endBlockId,
          evidenceBlockIds: draft.evidenceBlockIds,
          sourceWindow: draft.sourceBatch == null ? null : draft.sourceBatch + 1,
        })),
        blocks: blocks.map(blockOutlinePayload),
      }),
    },
  ];
}

function splitTopicBlocksForMimo(blocks) {
  const batches = [];
  let current = [];
  let chars = 0;
  const flush = () => {
    if (current.length === 0) return;
    batches.push(current);
    current = [];
    chars = 0;
  };
  for (const block of blocks) {
    const blockChars = block.text.length;
    if (current.length > 0 && (current.length >= DEFAULT_BATCH_MAX_BLOCKS || chars + blockChars > DEFAULT_BATCH_MAX_CHARS)) flush();
    current.push(block);
    chars += blockChars;
  }
  flush();
  return batches;
}

function normalizeMimoTopicDrafts(raw, blocks, sourceBatch, limit = DEFAULT_TOPIC_OUTPUT_LIMIT) {
  const records = unwrapTopicRecords(raw);
  const blockById = new Map(blocks.map(block => [block.id, block]));
  const blockOrder = new Map(blocks.map((block, index) => [block.id, index]));
  const drafts = [];
  let lastBlockIndex = -1;

  for (const record of records) {
    const title = readString(record.title);
    const summary = readString(record.summary);
    const startBlockId = readString(record.startBlockId);
    const endBlockId = readString(record.endBlockId);
    if (!title || !summary || !startBlockId || !endBlockId) continue;

    const startOrder = blockOrder.get(startBlockId);
    const endOrder = blockOrder.get(endBlockId);
    if (!blockById.has(startBlockId) || !blockById.has(endBlockId) || startOrder == null || endOrder == null) continue;
    if (endOrder < startOrder || startOrder <= lastBlockIndex) continue;

    drafts.push({
      title: cleanPublicText(title, 48),
      summary: cleanPublicText(summary, 160),
      startBlockId,
      endBlockId,
      evidenceBlockIds: readStringArray(record.evidenceBlockIds).filter(id => blockById.has(id)),
      sourceBatch,
    });
    lastBlockIndex = endOrder;
  }
  return drafts.slice(0, limit);
}

function mapDraftsToPersistedTopics(drafts, blocks, segments) {
  const blockById = new Map(blocks.map(block => [block.id, block]));
  const blockOrder = new Map(blocks.map((block, index) => [block.id, index]));
  const topics = [];
  let lastEndMs = -1;

  for (const draft of drafts) {
    const startBlock = blockById.get(draft.startBlockId);
    const endBlock = blockById.get(draft.endBlockId);
    const startOrder = blockOrder.get(draft.startBlockId);
    const endOrder = blockOrder.get(draft.endBlockId);
    if (!startBlock || !endBlock || startOrder == null || endOrder == null || endOrder < startOrder) continue;
    if (startBlock.startMs < lastEndMs) continue;

    topics.push({
      id: `topic-${topics.length}`,
      title: draft.title,
      summary: draft.summary,
      startMs: startBlock.startMs,
      endMs: endBlock.endMs,
      segmentStart: startBlock.segmentStart,
      segmentEnd: Math.min(endBlock.segmentEnd, segments[segments.length - 1]?.index ?? endBlock.segmentEnd),
      startBlockId: draft.startBlockId,
      endBlockId: draft.endBlockId,
      evidenceBlockIds: draft.evidenceBlockIds,
      keywords: draft.evidenceBlockIds,
    });
    lastEndMs = endBlock.endMs;
  }
  return makeTopicsContinuous(topics, blocks, segments);
}

function buildFallbackTopic(title, segments) {
  const first = segments[0];
  const last = segments[segments.length - 1];
  if (!first || !last) return null;
  return {
    id: 'topic-0',
    title: cleanPublicText(title || '完整视频内容', 48),
    summary: '字幕内容较短或缺少可分章语义，保留完整视频为一个主题入口。',
    startMs: first.startMs,
    endMs: last.endMs,
    segmentStart: first.index,
    segmentEnd: last.index,
    keywords: [],
  };
}

function makeTopicsContinuous(topics, blocks, segments) {
  if (topics.length === 0) return [];
  const blockAtTime = ms => [...blocks].reverse().find(block => ms >= block.startMs) || blocks[blocks.length - 1] || null;
  const lastSegment = segments[segments.length - 1] || null;

  return topics.map((topic, index) => {
    const next = topics[index + 1] || null;
    const nextStartMs = next?.startMs ?? lastSegment?.endMs ?? topic.endMs;
    const endMs = Math.max(topic.startMs, next ? nextStartMs - 1 : nextStartMs);
    const endBlock = blockAtTime(endMs);
    return {
      ...topic,
      endMs,
      segmentEnd: next
        ? Math.max(topic.segmentStart, next.segmentStart - 1)
        : (lastSegment?.index ?? topic.segmentEnd),
      endBlockId: endBlock?.id ?? topic.endBlockId,
    };
  });
}

function parseYoutubeTranscriptSegments(segmentsText) {
  const rawRows = segmentsText.split(/\r?\n/).filter(Boolean);
  const rows = rawRows
    .map((row, index) => parseTranscriptRow(row, index))
    .filter(Boolean)
    .sort((left, right) => left.startMs - right.startMs || left.index - right.index);

  return rows.map((row, index) => {
    const nextStart = rows[index + 1]?.startMs ?? null;
    const fallbackDuration = nextStart && nextStart > row.startMs ? nextStart - row.startMs : 4000;
    const durationMs = row.durationMs && row.durationMs > 0 ? row.durationMs : fallbackDuration;
    return {
      ...row,
      index,
      durationMs,
      endMs: row.startMs + durationMs,
    };
  });
}

function parseTranscriptRow(row, index) {
  const firstTab = row.indexOf('\t');
  if (firstTab < 0) return null;
  const secondTab = row.indexOf('\t', firstTab + 1);
  if (secondTab < 0) return null;

  const startMs = Number(row.slice(0, firstTab));
  if (!Number.isFinite(startMs)) return null;

  const durationRaw = row.slice(firstTab + 1, secondTab).trim();
  const durationMs = durationRaw ? Number(durationRaw) : null;
  const textRaw = row.slice(secondTab + 1);
  const text = normalizeTranscriptText(parseJsonText(textRaw));
  if (!text) return null;

  return {
    index,
    startMs: Math.max(0, Math.round(startMs)),
    durationMs: Number.isFinite(durationMs) ? Math.max(0, Math.round(durationMs)) : null,
    text,
  };
}

function buildMimoTopicInputBlocks(segments, targetMs = 45_000) {
  if (segments.length === 0) return [];
  return buildTranscriptBlocks(segments, targetMs).map(block => ({
    ...block,
    text: truncateText(block.text, 1600),
  }));
}

function buildTranscriptBlocks(segments, targetMs = 28_000) {
  if (segments.length === 0) return [];
  const blocks = [];
  let current = [];
  const flush = () => {
    if (current.length === 0) return;
    const first = current[0];
    const last = current[current.length - 1];
    blocks.push({
      id: `block-${blocks.length}`,
      startMs: first.startMs,
      endMs: last.endMs,
      segmentStart: first.index,
      segmentEnd: last.index,
      text: joinReadableText(current.map(segment => segment.text)),
    });
    current = [];
  };
  for (const segment of segments) {
    current.push(segment);
    const first = current[0];
    const elapsed = segment.endMs - first.startMs;
    const endsSentence = /[.!?。！？]\s*$/.test(segment.text);
    if (elapsed >= targetMs && (endsSentence || elapsed >= targetMs * 1.6)) flush();
  }
  flush();
  return blocks;
}

function blockPayload(block) {
  return {
    id: block.id,
    startMs: block.startMs,
    endMs: block.endMs,
    time: `${formatTranscriptTime(block.startMs)}-${formatTranscriptTime(block.endMs)}`,
    text: block.text,
  };
}

function blockOutlinePayload(block) {
  return {
    id: block.id,
    startMs: block.startMs,
    endMs: block.endMs,
    time: `${formatTranscriptTime(block.startMs)}-${formatTranscriptTime(block.endMs)}`,
  };
}

function videoPayload(input) {
  return {
    id: input.videoId,
    title: input.title,
    personName: input.personName,
    personTitle: input.personTitle,
    tags: input.tags,
  };
}

function topicOutputShape() {
  return {
    topics: [
      {
        title: '主题标题，8-24 个中文字符，必须是语义概括',
        summary: '一句话说明这一段主要讲什么',
        startBlockId: '必须是 input.blocks 里的 id',
        endBlockId: '必须是 input.blocks 里的 id，且不能早于 startBlockId',
        evidenceBlockIds: ['用于支撑主题判断的 block id，可空但必须来自 input.blocks'],
      },
    ],
  };
}

function unwrapTopicRecords(raw) {
  let current = raw;
  for (let depth = 0; depth < 4; depth += 1) {
    if (Array.isArray(current)) return current.filter(isRecord);
    const record = isRecord(current) ? current : null;
    if (!record) return [];
    for (const key of ['topics', 'mimoTopicTimeline', 'videoTopicTimeline', 'youtubeTopicTimeline', 'topicTimeline', 'semanticTopicTimeline']) {
      if (Array.isArray(record[key])) return record[key].filter(isRecord);
    }
    current = record.result || record.data || record.timeline || record.videoTopicTimeline;
  }
  return [];
}

function hasPersistedTimeline(metadata) {
  const record = plainRecord(metadata);
  return ['mimoTopicTimeline', 'videoTopicTimeline', 'youtubeTopicTimeline', 'topicTimeline', 'semanticTopicTimeline']
    .some(key => Array.isArray(record[key]) && record[key].length > 0);
}

function parseArgs(args) {
  const options = {
    execute: false,
    force: false,
    limit: 10,
    scanLimit: 2000,
    sourceId: null,
    provider: process.env.TOPIC_PROVIDER || 'minimax',
    model: null,
    transport: process.env.TOPIC_TRANSPORT || null,
    shardIndex: 0,
    shardCount: 1,
    includeCaptionItems: false,
  };
  for (const arg of args) {
    if (arg === '--execute') options.execute = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--include-caption-items') options.includeCaptionItems = true;
    else if (arg.startsWith('--limit=')) options.limit = positiveInt(arg.slice('--limit='.length), options.limit);
    else if (arg.startsWith('--scan-limit=')) options.scanLimit = positiveInt(arg.slice('--scan-limit='.length), options.scanLimit);
    else if (arg.startsWith('--source-id=')) options.sourceId = arg.slice('--source-id='.length).trim() || null;
    else if (arg.startsWith('--provider=')) options.provider = arg.slice('--provider='.length).trim() || options.provider;
    else if (arg.startsWith('--transport=')) options.transport = arg.slice('--transport='.length).trim() || options.transport;
    else if (arg.startsWith('--model=')) options.model = arg.slice('--model='.length).trim() || options.model;
    else if (arg.startsWith('--shard-index=')) options.shardIndex = positiveInt(arg.slice('--shard-index='.length), options.shardIndex);
    else if (arg.startsWith('--shard-count=')) options.shardCount = positiveInt(arg.slice('--shard-count='.length), options.shardCount);
  }
  if (options.shardCount < 1) options.shardCount = 1;
  if (options.shardIndex >= options.shardCount) throw new Error(`Invalid shard: index ${options.shardIndex} must be < count ${options.shardCount}`);
  return options;
}

function resolveTopicProvider(options) {
  const provider = String(options.provider || 'minimax').toLowerCase();
  if (provider === 'mimo') {
    return {
      id: 'mimo',
      displayName: 'Mimo',
      apiKeyName: 'XIAOMI_API_KEY',
      apiKey: process.env.XIAOMI_API_KEY,
      baseUrl: (process.env.XIAOMI_API_URL || process.env.XIAOMI_BASE_URL || MIMO_BASE_URL).replace(/\/+$/, ''),
      model: options.model || process.env.MIMO_MODEL || DEFAULT_MIMO_MODEL,
      timelineKey: 'mimoTopicTimeline',
      transport: 'http',
    };
  }
  if (provider === 'minimax' || provider === 'neo-minimax') {
    const transport = options.transport || process.env.MINIMAX_TOPIC_TRANSPORT || 'mmx';
    if (transport !== 'mmx' && transport !== 'http') throw new Error(`Unsupported MiniMax transport: ${transport}`);
    return {
      id: 'minimax',
      displayName: 'MiniMax',
      apiKeyName: 'MINIMAX_API_KEY',
      apiKey: process.env.MINIMAX_API_KEY,
      baseUrl: (process.env.MINIMAX_API_URL || process.env.MINIMAX_BASE_URL || MINIMAX_BASE_URL).replace(/\/+$/, ''),
      model: options.model || process.env.MINIMAX_TOPIC_MODEL || process.env.MINIMAX_MODEL || DEFAULT_MINIMAX_MODEL,
      timelineKey: 'videoTopicTimeline',
      transport,
      region: process.env.MINIMAX_TOPIC_REGION || process.env.MINIMAX_REGION || 'cn',
    };
  }
  throw new Error(`Unsupported topic provider: ${options.provider}`);
}

function loadExtraEnv(filePath) {
  try {
    const parsed = parseEnv(fs.readFileSync(filePath));
    for (const [key, value] of Object.entries(parsed)) {
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // Optional env file.
  }
}

function extendDatabaseConnectTimeout() {
  if (!process.env.DATABASE_URL) return;
  try {
    const parsed = new URL(process.env.DATABASE_URL);
    if (!parsed.searchParams.has('connect_timeout')) parsed.searchParams.set('connect_timeout', '20');
    if (!parsed.searchParams.has('pool_timeout')) parsed.searchParams.set('pool_timeout', '20');
    process.env.DATABASE_URL = parsed.toString();
  } catch {
    // Leave non-URL values untouched.
  }
}

function extractYouTubeVideoId(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, '');
    if (hostname === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || null;
    if (hostname.endsWith('youtube.com')) {
      const queryId = parsed.searchParams.get('v');
      if (queryId) return queryId;
      const match = parsed.pathname.match(/\/(?:shorts|embed|live)\/([^/?#]+)/);
      return match?.[1] || null;
    }
  } catch {
    const match = url.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/|\/live\/)([A-Za-z0-9_-]{6,})/);
    return match?.[1] || null;
  }
  return null;
}

function extractJsonObject(text) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)?.[1];
  if (fenced) return JSON.parse(fenced);
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
  throw new Error(`Unable to parse JSON response: ${trimmed.slice(0, 240)}`);
}

function plainRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function readString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readStringArray(value) {
  return Array.isArray(value) ? value.filter(item => typeof item === 'string' && item.trim().length > 0) : [];
}

function arrayValue(value, key) {
  const record = plainRecord(value);
  return readStringArray(record[key]);
}

function uniqueStrings(values) {
  return Array.from(new Set(values.map(value => String(value).trim()).filter(Boolean)));
}

function cleanPublicText(value, maxLength) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function normalizeTranscriptText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/([\p{Script=Han}])\s+(?=[\p{Script=Han}])/gu, '$1')
    .replace(/([\p{Script=Han}])\s+([，。！？；：])/gu, '$1$2')
    .replace(/([，。！？；：])\s+([\p{Script=Han}])/gu, '$1$2')
    .trim();
}

function parseJsonText(value) {
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'string' ? parsed : String(parsed || '');
  } catch {
    return value.replace(/^"|"$/g, '');
  }
}

function joinReadableText(parts) {
  const text = normalizeTranscriptText(parts.join(' '));
  return text.replace(/\s+([,.!?;:，。！？；：])/g, '$1');
}

function truncateText(value, maxLength) {
  const text = String(value || '').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}...`;
}

function formatTranscriptTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function positiveIntEnv(key, fallback, min, max) {
  const parsed = Number(process.env[key]);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
