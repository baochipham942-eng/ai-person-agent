import { registerPipeline } from '../registry';
import { runCompanyBlogs } from '@/lib/pipelines/company-blogs';
import type { PipelineContext } from '../types';

registerPipeline({
  kind: 'company_blogs_fetch',
  label: '公司官方博客抓取',
  category: 'content',
  optionFields: [
    { key: 'only', label: '仅某公司（可选）', type: 'text', placeholder: '如 OpenAI，留空抓全部' },
    { key: 'perCompany', label: '每家最多抓几篇', type: 'number', defaultValue: 15 },
  ],
  run: async (ctx: PipelineContext) => {
    const only = typeof ctx.options.only === 'string' && ctx.options.only.trim() ? ctx.options.only.trim() : undefined;
    const perCompany = Number(ctx.options.perCompany) || 15;
    await runCompanyBlogs(
      { execute: !ctx.dryRun, only, perCompany, quiet: true },
      {
        log: (level, message, metadata) => ctx.log(level, message, metadata),
        setTotal: (total) => ctx.setTotal(total),
        setDone: (done) => ctx.setDone(done),
        isCancelled: () => ctx.isCancelled(),
      },
    );
  },
});
