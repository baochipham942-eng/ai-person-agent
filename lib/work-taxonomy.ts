/**
 * 作品/成果（内部表名 Product）的归类与命名单一真理源。
 * 回填脚本（materialize_products）与运行时（人物页把 JSON 作品名映射到 /work slug）共用，
 * 保证 slug / 系列折叠 / 类型判断三处一致。
 *
 * 用户可见一律「作品/成果」，模型显示为「模型」，永不把模型标成"产品"。
 */

export type WorkType = 'model' | 'app' | 'tool' | 'framework' | 'architecture' | 'lab' | 'benchmark' | 'dataset' | 'other';

export const WORK_TYPE_LABELS: Record<string, string> = {
  model: '模型',
  app: '产品',
  tool: '工具',
  framework: '框架',
  architecture: '架构',
  lab: '实验室',
  benchmark: '基准',
  dataset: '数据集',
  other: '成果',
};

export function workTypeLabel(type: string, isSeries = false): string {
  const base = WORK_TYPE_LABELS[type] || '成果';
  return type === 'model' && isSeries ? '模型系列' : base;
}

// 模型系列折叠：命中则归并为系列名（type=model）。注意排除产品壳（"Claude Code"/"Gemini CLI"）。
const MODEL_SERIES: Array<{ test: (n: string) => boolean; name: string }> = [
  { test: n => /^gpt[-\s]?[\d.]+/i.test(n) || /^gpt$/i.test(n), name: 'GPT' },
  { test: n => /^claude(\s+(\d|opus|sonnet|haiku|instant|next))/i.test(n) || /^claude$/i.test(n), name: 'Claude' },
  { test: n => /^gemini(\s|$|-)/i.test(n) && !/cli/i.test(n), name: 'Gemini' },
  { test: n => /^llama([-\s]|$)/i.test(n), name: 'Llama' },
  { test: n => /^o[1-9]\b/i.test(n), name: 'o 系列' },
  { test: n => /^dall[\s·.\-]?e/i.test(n), name: 'DALL·E' },
  { test: n => /^stable\s*diffusion/i.test(n), name: 'Stable Diffusion' },
  { test: n => /^gemma/i.test(n), name: 'Gemma' },
  { test: n => /^mistral/i.test(n) && !/^mistral ai$/i.test(n), name: 'Mistral' },
  { test: n => /^qwen/i.test(n), name: 'Qwen' },
];

const TYPE_OVERRIDES: Record<string, string> = {
  chatgpt: 'app',
  copilot: 'app',
  cursor: 'tool',
  perplexityai: 'app',
  midjourney: 'model',
  transformer: 'architecture',
};

export function dedupKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9一-龥]/g, '');
}

export function slugifyWork(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9一-龥]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'work'
  );
}

export function normalizeWorkType(name: string, type?: string, category?: string): WorkType {
  const override = TYPE_OVERRIDES[dedupKey(name)] as WorkType | undefined;
  if (override) return override;
  const hay = `${type || ''} ${category || ''}`.toLowerCase();
  if (/(model|llm|gpt|video|diffusion|多模态)/.test(hay)) return 'model';
  if (/(lab|research|研究)/.test(hay)) return 'lab';
  if (/(benchmark|eval|评测|基准)/.test(hay)) return 'benchmark';
  if (/(dataset|数据集)/.test(hay)) return 'dataset';
  if (/(framework|sdk|library|框架)/.test(hay)) return 'framework';
  if (/(architecture|架构|transformer)/.test(hay)) return 'architecture';
  if (/(tool|coding|ide|editor|app|平台|工具|产品|assistant|对话)/.test(hay)) return 'tool';
  return 'other';
}

export interface CanonicalWork {
  key: string;
  displayName: string;
  slug: string;
  type: WorkType;
  isSeries: boolean;
}

/** 把一个原始作品名归一到 canonical 身份（系列折叠 + 类型 + slug）。 */
export function resolveCanonicalWork(name: string, type?: string, category?: string): CanonicalWork {
  const trimmed = name.trim();
  for (const s of MODEL_SERIES) {
    if (s.test(trimmed)) {
      return { key: dedupKey(s.name), displayName: s.name, slug: slugifyWork(s.name), type: 'model', isSeries: true };
    }
  }
  return {
    key: dedupKey(trimmed),
    displayName: trimmed,
    slug: slugifyWork(trimmed),
    type: normalizeWorkType(trimmed, type, category),
    isSeries: false,
  };
}
