export type PipelineCategory = 'person' | 'content';

export type PipelineOptionFieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'select';

export interface PipelineOptionField {
  key: string;
  label: string;
  type: PipelineOptionFieldType;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  /** type==='select' 时的可选项 */
  options?: Array<{ value: string; label: string }>;
  help?: string;
}

export interface PipelineValidateInput {
  dryRun: boolean;
  targetPersonIds: string[];
  options: Record<string, unknown>;
}

export type PipelineLogLevel = 'info' | 'warning' | 'error';

/** pipeline 运行时拿到的横切能力。所有写副作用收口在这里，便于单测 mock。 */
export interface PipelineContext {
  jobId: string;
  dryRun: boolean;
  options: Record<string, unknown>;
  requestedById: string | null;
  targetPersonIds: string[];
  log(level: PipelineLogLevel, message: string, metadata?: Record<string, unknown>): Promise<void>;
  setTotal(total: number): Promise<void>;
  setDone(done: number): Promise<void>;
  /** 只读检查：是否已请求取消（job.status==='cancelling'）。pipeline 见 true 应尽快 return，由外壳负责落终态。 */
  isCancelled(): Promise<boolean>;
}

export interface MaintenancePipeline {
  kind: string;
  label: string;
  category: PipelineCategory;
  optionFields?: PipelineOptionField[];
  /** 返回错误文案表示校验不通过；返回 null 表示通过。缺省视为通过。 */
  validate?(input: PipelineValidateInput): string | null;
  run(ctx: PipelineContext): Promise<void>;
}
