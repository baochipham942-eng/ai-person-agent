import { registerPipeline } from '../registry';
import { runThreadsLink, THREADS_LINK_DEFAULT_TYPES } from '@/lib/pipelines/threads-link';
import type { PipelineContext } from '../types';

registerPipeline({
  kind: 'threads_content_link',
  label: '内容挂载知识主题',
  category: 'content',
  optionFields: [
    { key: 'limit', label: '处理内容上限', type: 'number', defaultValue: 500 },
    { key: 'minScore', label: '挂载最低分', type: 'number', defaultValue: 1.5 },
    { key: 'highScore', label: '计入就绪度阈值', type: 'number', defaultValue: 2.5 },
    { key: 'maxPerItem', label: '每条最多挂几主题', type: 'number', defaultValue: 2 },
  ],
  run: async (ctx: PipelineContext) => {
    const limit = Number(ctx.options.limit) || 500;
    const minScore = Number(ctx.options.minScore) || 1.5;
    const highScore = Number(ctx.options.highScore) || 2.5;
    const maxPerItem = Number(ctx.options.maxPerItem) || 2;
    await runThreadsLink(
      { execute: !ctx.dryRun, limit, minScore, highScore, maxPerItem, types: THREADS_LINK_DEFAULT_TYPES, includeCompany: true, quiet: true },
      {
        log: (level, message, metadata) => ctx.log(level, message, metadata),
        setTotal: (total) => ctx.setTotal(total),
        setDone: (done) => ctx.setDone(done),
        isCancelled: () => ctx.isCancelled(),
      },
    );
  },
});
