import type { PaperGuide, PaperGuideSectionType } from './schemas';
import type {
  PaperFigureCard,
  PaperReadingPathStep,
  PaperReferenceLookup,
  PaperSemanticReaderView,
  PaperSkimmingAssistItem,
  PaperSkimmingRole,
  PaperStructureSection,
  PaperStructureView,
} from './types';
import { emptyPaperReferenceLookup } from './references';

export function buildPaperSemanticReader(
  guide: PaperGuide,
  structure: PaperStructureView,
  referenceLookup: PaperReferenceLookup = emptyPaperReferenceLookup('not_requested'),
  figures: PaperFigureCard[] = [],
): PaperSemanticReaderView {
  const skimmingAssist = buildSkimmingAssistItems(guide, structure);
  const readingPath = buildSemanticReadingPath(skimmingAssist, structure.sections, figures);
  return {
    source: structure.source,
    skimmingAssist,
    jumpTargetCount: skimmingAssist.filter(item => item.pageNumber !== null).length,
    figures,
    readingPath,
    citationCards: referenceLookup.cards,
    referenceStatus: referenceLookup.status,
  };
}

function buildSkimmingAssistItems(
  guide: PaperGuide,
  structure: PaperStructureView,
): PaperSkimmingAssistItem[] {
  const specs: Array<{
    role: PaperSkimmingRole;
    label: string;
    sectionType: PaperGuideSectionType;
    body: string;
    preferredTypes: PaperGuideSectionType[];
    keywords: string[];
  }> = [
    {
      role: 'objective',
      label: 'Objective',
      sectionType: 'problem',
      body: guide.problem,
      preferredTypes: ['problem', 'abstract', 'other'],
      keywords: ['objective', 'problem', 'motivation', 'aim', 'goal', 'task', 'challenge'],
    },
    {
      role: 'novelty',
      label: 'Novelty',
      sectionType: 'problem',
      body: guide.novelty,
      preferredTypes: ['problem', 'abstract', 'method', 'other'],
      keywords: ['novel', 'novelty', 'contribution', 'propose', 'introduce', 'new', 'first'],
    },
    {
      role: 'method',
      label: 'Method',
      sectionType: 'method',
      body: guide.method,
      preferredTypes: ['method', 'experiment', 'other'],
      keywords: ['method', 'approach', 'framework', 'model', 'algorithm', 'pipeline', 'training'],
    },
    {
      role: 'result',
      label: 'Result',
      sectionType: 'result',
      body: guide.experiments,
      preferredTypes: ['result', 'experiment', 'method', 'other'],
      keywords: ['result', 'experiment', 'evaluation', 'benchmark', 'performance', 'outperform', 'accuracy'],
    },
    {
      role: 'limitation',
      label: 'Limitation',
      sectionType: 'limitation',
      body: guide.limitations,
      preferredTypes: ['limitation', 'result', 'experiment', 'other'],
      keywords: ['limitation', 'future work', 'failure', 'risk', 'constraint', 'ablation', 'discussion'],
    },
  ];

  return specs.map(spec => {
    const section = findSkimmingSection(structure.sections, spec.preferredTypes, spec.keywords);
    return {
      id: spec.role,
      role: spec.role,
      label: spec.label,
      sectionType: spec.sectionType,
      body: spec.body,
      sectionId: section?.id || null,
      sectionTitle: section?.title || null,
      pageNumber: section?.pageStart || null,
      pageEnd: section?.pageEnd || null,
      textPreview: section?.textPreview || null,
      source: section && structure.source === 'paper_document' ? 'paper_document' : 'guide',
    };
  });
}

function buildSemanticReadingPath(
  skimmingAssist: PaperSkimmingAssistItem[],
  sections: PaperStructureSection[],
  figures: PaperFigureCard[],
): PaperReadingPathStep[] {
  const steps: PaperReadingPathStep[] = [];
  const seen = new Set<string>();

  const push = (step: PaperReadingPathStep | null) => {
    if (!step) return;
    const key = `${step.kind}:${step.targetId || step.sectionType || step.title}`;
    if (seen.has(key)) return;
    seen.add(key);
    steps.push(step);
  };

  const firstFigure = figures.find(figure => figure.pageNumber !== null) || figures[0];
  if (firstFigure) {
    push({
      id: `reading-figure:${firstFigure.id}`,
      kind: 'figure',
      label: '先看图表',
      title: `先看 ${firstFigure.label}`,
      why: firstFigure.readerHint,
      pageNumber: firstFigure.pageNumber,
      targetId: firstFigure.id,
      sectionType: null,
    });
  }

  push(readingPathStepFromSectionOrSkim({
    label: steps.length > 0 ? '再看方法' : '先看方法',
    title: '理解方法和系统结构',
    why: '把论文的方法流程、系统组件或实验设置先连起来，后面的结果和局限才有上下文。',
    sectionTypes: ['method', 'experiment'],
    skimRoles: ['method'],
    sections,
    skimmingAssist,
  }));

  push(readingPathStepFromSectionOrSkim({
    label: '核对结果',
    title: '核对结果证据',
    why: '看论文用什么实验、数字或论证证明主张，避免只停留在摘要判断。',
    sectionTypes: ['result', 'experiment'],
    skimRoles: ['result'],
    sections,
    skimmingAssist,
  }));

  push(readingPathStepFromSectionOrSkim({
    label: '最后看局限',
    title: '检查边界和风险',
    why: '确认论文自己承认的限制、适用范围和可能偏差，判断是否值得深读或引用。',
    sectionTypes: ['limitation'],
    skimRoles: ['limitation'],
    sections,
    skimmingAssist,
  }));

  if (steps.length < 3) {
    push(readingPathStepFromSectionOrSkim({
      label: steps.length > 0 ? '补看问题' : '先看问题',
      title: '确认研究问题',
      why: '先确认论文到底想解决什么问题，再决定是否继续读方法和证据。',
      sectionTypes: ['problem', 'abstract'],
      skimRoles: ['objective', 'novelty'],
      sections,
      skimmingAssist,
    }));
  }

  return steps.slice(0, 5).map((step, index) => ({
    ...step,
    label: `${String(index + 1).padStart(2, '0')} · ${step.label}`,
  }));
}

function readingPathStepFromSectionOrSkim(input: {
  label: string;
  title: string;
  why: string;
  sectionTypes: PaperGuideSectionType[];
  skimRoles: PaperSkimmingRole[];
  sections: PaperStructureSection[];
  skimmingAssist: PaperSkimmingAssistItem[];
}): PaperReadingPathStep | null {
  for (const type of input.sectionTypes) {
    const section = input.sections.find(item => item.sectionType === type && (item.pageStart || item.textPreview));
    if (section) {
      return {
        id: `reading-section:${section.id}`,
        kind: 'section',
        label: input.label,
        title: section.title || input.title,
        why: input.why,
        pageNumber: section.pageStart,
        targetId: section.id,
        sectionType: section.sectionType,
      };
    }
  }

  for (const role of input.skimRoles) {
    const item = input.skimmingAssist.find(skim => skim.role === role);
    if (item) {
      return {
        id: `reading-skim:${item.id}`,
        kind: 'skim',
        label: input.label,
        title: item.sectionTitle || item.label || input.title,
        why: item.body || input.why,
        pageNumber: item.pageNumber,
        targetId: item.sectionId,
        sectionType: item.sectionType,
      };
    }
  }

  return null;
}

function findSkimmingSection(
  sections: PaperStructureSection[],
  preferredTypes: PaperGuideSectionType[],
  keywords: string[],
): PaperStructureSection | null {
  for (const type of preferredTypes) {
    const section = sections.find(item => item.sectionType === type && (item.pageStart || item.textPreview));
    if (section) return section;
  }

  const normalizedKeywords = keywords.map(keyword => keyword.toLowerCase());
  const scored = sections
    .map(section => {
      const haystack = `${section.title}\n${section.textPreview}`.toLowerCase();
      const score = normalizedKeywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0);
      return { section, score };
    })
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score || left.section.orderIndex - right.section.orderIndex);

  return scored[0]?.section || sections.find(section => section.pageStart || section.textPreview) || null;
}
