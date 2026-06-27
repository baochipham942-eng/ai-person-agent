import type { ExtractedPdfPage, PaperFigureCard, PaperFigureDraft } from './types';
import { truncate } from './utils';

export function extractPaperFigureCaptionsFromText(text: string, pageNumber: number | null = null): PaperFigureCard[] {
  return buildPaperFigureDrafts([{ pageNumber: pageNumber || 1, pageCount: pageNumber || 1, text }]).map(toPaperFigureCard);
}

export function buildPaperFigureDrafts(pages: ExtractedPdfPage[]): PaperFigureDraft[] {
  const figures: PaperFigureDraft[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    const normalized = page.text
      .replace(/\s+/g, ' ')
      .replace(/\b(Fig|Figure|Table)\s*([.:])\s*/gi, '$1$2 ')
      .trim();
    if (!normalized) continue;

    const pattern = /\b(Fig\.?|Figure|Table)\s+([A-Za-z0-9IVXivx.-]+)\s*[:.]?\s+/g;
    const matches = [...normalized.matchAll(pattern)];
    for (let index = 0; index < matches.length; index += 1) {
      const match = matches[index];
      if (typeof match.index !== 'number') continue;
      const next = matches[index + 1]?.index ?? normalized.length;
      const raw = normalized.slice(match.index, next);
      const label = normalizeFigureLabel(match[1], match[2]);
      const caption = cleanFigureCaption(raw, label);
      if (!label || caption.length < 24) continue;
      const key = label.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      figures.push({
        label,
        caption,
        pageNumber: page.pageNumber,
        orderIndex: figures.length,
        imagePath: null,
        ...buildFigureReaderInsight(label, caption),
      });
      if (figures.length >= 24) return figures;
    }
  }
  return figures;
}

function normalizeFigureLabel(kind: string, rawNumber: string): string {
  const lower = kind.toLowerCase();
  const number = rawNumber.replace(/[.:-]+$/g, '').trim();
  if (!number) return lower.startsWith('t') ? 'Table' : 'Figure';
  return lower.startsWith('t') ? `Table ${number}` : `Figure ${number}`;
}

function cleanFigureCaption(raw: string, label: string): string {
  const withoutLabel = raw
    .replace(/^\s*(?:Fig\.?|Figure|Table)\s+[A-Za-z0-9IVXivx.-]+\s*[:.]?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  const sentenceLimited = limitCaptionSentences(withoutLabel);
  const caption = truncate(sentenceLimited, 520);
  return caption || label;
}

function limitCaptionSentences(value: string): string {
  const clean = value.trim();
  if (clean.length <= 520) return clean;
  const boundary = clean.slice(0, 520).lastIndexOf('. ');
  if (boundary >= 120) return clean.slice(0, boundary + 1).trim();
  return clean.slice(0, 520).trim();
}

export function buildFigureReaderInsight(label: string, caption: string): Pick<PaperFigureDraft, 'evidenceRole' | 'evidenceLabel' | 'readerQuestion' | 'readerHint'> {
  const lower = `${label} ${caption}`.toLowerCase();
  if (/\b(ablation|variant|component|remove|without|sensitivity|robustness|stress|stress-test)\b/.test(lower)) {
    return {
      evidenceRole: 'ablation',
      evidenceLabel: '消融/稳健性',
      readerQuestion: '去掉关键组件或换设置后，论文主张还站得住吗？',
      readerHint: '这张图或表适合用来检查方法是不是依赖单一设置，能帮你判断结论是否稳健。',
    };
  }
  if (/\b(result|performance|benchmark|evaluation|accuracy|score|win rate|chrf|mmlu|f1|bleu)\b/.test(lower)) {
    return {
      evidenceRole: 'result',
      evidenceLabel: '结果证据',
      readerQuestion: '这里的数字是否直接支撑论文最核心的 claim？',
      readerHint: '这张图或表更像结果证据，适合用来判断方法是否真的有效。',
    };
  }
  if (/\b(dataset|data set|corpus|sample|distribution|split|language|domain|collection)\b/.test(lower)) {
    return {
      evidenceRole: 'dataset',
      evidenceLabel: '数据/任务',
      readerQuestion: '评估数据和任务范围是否足以支撑论文的泛化结论？',
      readerHint: '这张图或表主要说明数据、任务或样本分布，适合先确认实验边界。',
    };
  }
  if (/\barchitecture|pipeline|framework|system|design\b/.test(lower)) {
    return {
      evidenceRole: 'architecture',
      evidenceLabel: '系统结构',
      readerQuestion: '论文的方法由哪些模块组成，信息或控制流怎么走？',
      readerHint: '先看这张图，能快速把论文的系统结构和关键组件串起来。',
    };
  }
  if (/\b(limitation|failure|error|bias|risk|safety|unsafe|jailbreak|constraint)\b/.test(lower)) {
    return {
      evidenceRole: 'limitation',
      evidenceLabel: '局限/风险',
      readerQuestion: '这里暴露的失败模式会不会限制论文方法的适用范围？',
      readerHint: '这张图或表更适合用来检查边界条件和失败模式，不只看正向结果。',
    };
  }
  if (/\bmethod|algorithm|training|model|workflow\b/.test(lower)) {
    return {
      evidenceRole: 'method',
      evidenceLabel: '方法流程',
      readerQuestion: '这一步具体改变了训练、推理或评估流程里的什么？',
      readerHint: '这张图或表主要解释方法流程，适合在读方法段前后对照。',
    };
  }
  return {
    evidenceRole: 'overview',
    evidenceLabel: '扫读入口',
    readerQuestion: '这张图或表能帮你先定位哪一段论证最值得继续读？',
    readerHint: '这张图或表可作为快速扫读入口，用来定位论文论证链里的具体证据。',
  };
}

export function toPaperFigureCard(figure: PaperFigureDraft): PaperFigureCard {
  const insight = buildFigureReaderInsight(figure.label, figure.caption);
  return {
    id: figure.id || `figure:${figure.orderIndex}`,
    label: figure.label,
    caption: figure.caption,
    pageNumber: figure.pageNumber,
    orderIndex: figure.orderIndex,
    imagePath: figure.imagePath,
    evidenceRole: figure.evidenceRole || insight.evidenceRole,
    evidenceLabel: figure.evidenceLabel || insight.evidenceLabel,
    readerQuestion: figure.readerQuestion || insight.readerQuestion,
    readerHint: figure.readerHint || insight.readerHint,
  };
}
