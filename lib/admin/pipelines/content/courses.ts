import { registerPipeline } from '../registry';
import { runCoursesEnrich } from '@/lib/pipelines/courses-enrich';
import type { PipelineContext } from '../types';

registerPipeline({
  kind: 'courses_enrich',
  label: '课程富集',
  category: 'content',
  optionFields: [
    { key: 'limit', label: '处理人数上限', type: 'number', defaultValue: 50 },
    { key: 'personName', label: '仅某人物（可选）', type: 'text', placeholder: '如 Andrew Ng，留空处理缺课程的人' },
    { key: 'force', label: '强制刷新已有（true/false）', type: 'text', placeholder: 'true 则刷新已有课程的人', help: '留空=只补缺课程的人' },
  ],
  run: async (ctx: PipelineContext) => {
    const limit = Number(ctx.options.limit) || 50;
    const personName = typeof ctx.options.personName === 'string' && ctx.options.personName.trim() ? ctx.options.personName.trim() : undefined;
    const force = ctx.options.force === true || ctx.options.force === 'true';
    await runCoursesEnrich(
      { limit, force, personName, dryRun: ctx.dryRun },
      {
        log: (level, message, metadata) => ctx.log(level, message, metadata),
        setTotal: (total) => ctx.setTotal(total),
        setDone: (done) => ctx.setDone(done),
        isCancelled: () => ctx.isCancelled(),
      },
    );
  },
});
