import { registerPipeline } from '../registry';
import { runOpenalexPapers, DEFAULT_SINCE_DAYS } from '@/lib/pipelines/openalex-papers';
import type { PipelineContext } from '../types';

registerPipeline({
  kind: 'openalex_papers_fetch',
  label: '论文刷新（OpenAlex）',
  category: 'content',
  optionFields: [
    { key: 'limit', label: '处理人数上限', type: 'number', defaultValue: 60 },
    { key: 'works', label: '每人取论文数', type: 'number', defaultValue: 10 },
    { key: 'since', label: '仅某日后发表（可选 YYYY-MM-DD）', type: 'text', placeholder: '留空=近 18 个月' },
    { key: 'roles', label: '人群', type: 'select', defaultValue: 'academic', options: [
      { value: 'academic', label: '学者（researcher/professor）' },
      { value: 'all', label: '全部角色' },
    ] },
    { key: 'names', label: '指定人物（可选，逗号分隔）', type: 'text', placeholder: '如 Andrej Karpathy,杨植麟' },
  ],
  run: async (ctx: PipelineContext) => {
    const limit = Number(ctx.options.limit) || 60;
    const works = Number(ctx.options.works) || 10;
    const roles = ctx.options.roles === 'all' ? 'all' : 'academic';
    const names = typeof ctx.options.names === 'string' && ctx.options.names.trim()
      ? ctx.options.names.split(',').map(s => s.trim()).filter(Boolean)
      : undefined;
    let since: Date | undefined;
    if (typeof ctx.options.since === 'string' && ctx.options.since.trim()) {
      const d = new Date(ctx.options.since.trim());
      if (!Number.isNaN(d.getTime())) since = d;
    }
    if (!since) since = new Date(Date.now() - DEFAULT_SINCE_DAYS * 86_400_000);

    await runOpenalexPapers(
      { execute: !ctx.dryRun, quiet: true, limit, works, since, allTime: false, roles, names, minCitations: 0, delayMs: 150 },
      {
        log: (level, message, metadata) => ctx.log(level, message, metadata),
        setTotal: (total) => ctx.setTotal(total),
        setDone: (done) => ctx.setDone(done),
        isCancelled: () => ctx.isCancelled(),
      },
    );
  },
});
