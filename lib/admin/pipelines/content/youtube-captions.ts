import { registerPipeline } from '../registry';
import { runYoutubeCaptions } from '@/lib/pipelines/youtube-captions';
import type { PipelineContext } from '../types';

registerPipeline({
  kind: 'youtube_captions_fetch',
  label: 'YouTube 字幕抓取',
  category: 'content',
  optionFields: [
    { key: 'mode', label: '模式', type: 'select', defaultValue: 'both', options: [
      { value: 'both', label: 'backfill + fetch-new' },
      { value: 'backfill', label: '仅补关键词（零额度）' },
      { value: 'fetch', label: '仅抓新字幕' },
    ] },
    { key: 'maxSupadata', label: 'Supadata 调用上限（护额度）', type: 'number', defaultValue: 50 },
    { key: 'limit', label: '每阶段处理上限', type: 'number', defaultValue: 200 },
    { key: 'person', label: '仅某人物（可选）', type: 'text', placeholder: '人物 ID/姓名，留空全量' },
  ],
  run: async (ctx: PipelineContext) => {
    const mode = ctx.options.mode === 'backfill' ? 'backfill' : ctx.options.mode === 'fetch' ? 'fetch' : 'both';
    const maxSupadata = Number(ctx.options.maxSupadata) || 50;
    const limit = Number(ctx.options.limit) || 200;
    const person = typeof ctx.options.person === 'string' && ctx.options.person.trim() ? ctx.options.person.trim() : undefined;
    await runYoutubeCaptions(
      {
        execute: !ctx.dryRun,
        backfillOnly: mode === 'backfill',
        fetchOnly: mode === 'fetch',
        limit,
        maxSupadata,
        person,
        skipKeywords: false,
        shards: 1,
        shardIndex: 0,
        quiet: true,
      },
      {
        log: (level, message, metadata) => ctx.log(level, message, metadata),
        setTotal: (total) => ctx.setTotal(total),
        setDone: (done) => ctx.setDone(done),
        isCancelled: () => ctx.isCancelled(),
      },
    );
  },
});
