/**
 * 内容管线核心函数的可选运行钩子。
 * ctx 缺省 = CLI 裸跑（退化为 console）；传入 = 后台（进度/日志/取消落库）。
 * 后台侧由 lib/admin/pipelines/content/* 用 PipelineContext 适配传入。
 */
export interface PipelineRunHooks {
  log?(level: 'info' | 'warning' | 'error', message: string, metadata?: Record<string, unknown>): Promise<void>;
  setTotal?(total: number): Promise<void>;
  setDone?(done: number): Promise<void>;
  isCancelled?(): Promise<boolean>;
}

/** 把 hooks.log 归一成一个总是可调用的函数，缺省打 console。 */
export function makeLogger(hooks: PipelineRunHooks) {
  return async (level: 'info' | 'warning' | 'error', message: string, metadata?: Record<string, unknown>) => {
    if (hooks.log) await hooks.log(level, message, metadata);
    else console.log(message);
  };
}
