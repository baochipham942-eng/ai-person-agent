#!/usr/bin/env tsx
/**
 * 知识主题候选包生成器。
 * 喂一份结构化 spec（thread 元 + sources + edges），自动算 urlHash、填 text/metadata、
 * 补 sourceRequirements/review 样板，产出符合现有 schema 的 <slug>-sources.candidates.json。
 *
 * 运行：npx tsx scripts/threads/build_candidate_packs.ts [--only=<slug>] [--dry-run]
 * 仅生成 data/knowledge-threads/*.candidates.json；注册/presentation/people 仍在 lib 手动加。
 *
 * 数据真理源 = THREAD_SPECS（本文件下方），由联网研究草稿逐条核对后录入。
 */
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { THREAD_SPECS, type ThreadSpec, type SourceSpec } from './new_thread_specs';

const OUT_DIR = join(process.cwd(), 'data', 'knowledge-threads');

const STANDARD_SOURCE_REQUIREMENTS = {
  requiredRoles: ['signal', 'official_definition', 'transcript_context', 'paper_foundation', 'implementation_signal'],
  minimumSourceCount: 15,
  primarySourcePreference: true,
  excludedFromTopicReadiness: ['earnings_transcript', 'sec_filing', 'investor_relations', 'annual_report', 'shareholder_letter'],
  companyStrategyContextPolicy:
    'Company strategy sources may be kept only as optional company_strategy_context targets and must not count toward topic readiness.',
};

function urlHash(url: string): string {
  return createHash('sha256').update(url, 'utf8').digest('hex');
}

/** text 字段：标题 + 相关性 + 证据引文 + 复核备注拼成的检索摘要（与现有 11 包同构）。 */
function buildText(s: SourceSpec): string {
  const parts = [s.title, s.whyRelevant];
  if (s.evidenceQuote) parts.push(`Evidence note: ${s.evidenceQuote}`);
  if (s.reviewNotes) parts.push(s.reviewNotes);
  return parts.join('\n\n');
}

function buildSource(s: SourceSpec) {
  return {
    id: s.id,
    role: s.role,
    sourceKind: s.sourceKind,
    sourceOwner: s.sourceOwner,
    url: s.url,
    title: s.title,
    publishedAt: s.publishedAt ?? null,
    whyRelevant: s.whyRelevant,
    confidence: s.confidence,
    evidenceQuote: s.evidenceQuote ?? null,
    reviewNotes: s.reviewNotes ?? 'Verified online during deep-core research.',
    status: s.status ?? 'verified',
    metadata: { role: s.role, textStatus: 'review_summary_not_fulltext' },
    text: buildText(s),
    urlHash: urlHash(s.url),
  };
}

function buildPack(spec: ThreadSpec) {
  const roleCounts: Record<string, number> = {};
  for (const s of spec.sources) roleCounts[s.role] = (roleCounts[s.role] ?? 0) + 1;
  const missingRoles = STANDARD_SOURCE_REQUIREMENTS.requiredRoles.filter(r => !roleCounts[r] || roleCounts[r] < 1);

  return {
    thread: {
      slug: spec.slug,
      title: spec.title,
      status: 'curated',
      updatedAt: spec.updatedAt,
      category: spec.category,
      tags: spec.tags,
      aliases: spec.aliases,
      definitionDraft: spec.definitionDraft,
      whyNow: spec.whyNow,
      useBoundary: spec.useBoundary,
    },
    sourceRequirements: STANDARD_SOURCE_REQUIREMENTS,
    sources: spec.sources.map(buildSource),
    edges: spec.edges.map(e => ({
      fromId: e.fromId,
      toId: e.toId,
      relationType: e.relationType,
      confidence: e.confidence,
      evidenceNote: e.evidenceNote,
    })),
    review: {
      missingRoles,
      weakSources: spec.sources.filter(s => (s.status ?? 'verified') !== 'verified').map(s => `${s.id}:${s.status}`),
      duplicateGroups: [],
      publishReadiness: missingRoles.length === 0 && spec.sources.length >= 15 ? 'curated' : 'source_pack_review',
      notes: spec.reviewNotes,
    },
  };
}

function main() {
  const onlyArg = process.argv.find(a => a.startsWith('--only='));
  const only = onlyArg ? onlyArg.split('=')[1] : null;
  const dryRun = process.argv.includes('--dry-run');

  const specs = only ? THREAD_SPECS.filter(s => s.slug === only) : THREAD_SPECS;
  if (specs.length === 0) {
    console.error(`没有匹配的 spec${only ? `（--only=${only}）` : ''}`);
    process.exit(1);
  }

  for (const spec of specs) {
    const pack = buildPack(spec);
    const file = join(OUT_DIR, `${spec.slug}-sources.candidates.json`);
    const roleSummary = STANDARD_SOURCE_REQUIREMENTS.requiredRoles
      .map(r => `${r}:${pack.sources.filter(s => s.role === r).length}`)
      .join(' ');
    console.log(
      `📦 ${spec.slug}: ${pack.sources.length} 源 / ${pack.edges.length} 边 | ${roleSummary} | readiness=${pack.review.publishReadiness}` +
        (pack.review.missingRoles.length ? ` | ⚠️缺角色 ${pack.review.missingRoles.join(',')}` : ''),
    );
    if (!dryRun) {
      writeFileSync(file, JSON.stringify(pack, null, 2) + '\n', 'utf8');
      console.log(`   → 写入 ${file}`);
    }
  }
  console.log(dryRun ? '\n(dry-run，未写文件)' : '\n✅ 完成');
}

main();
