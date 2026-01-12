/**
 * RawPoolItem 相关性审核脚本
 *
 * 使用 LLM 评估 YouTube/GitHub 数据是否与人物相关，生成审核报告供人工确认
 *
 * 用法: npx tsx scripts/audit/audit_rawpool_relevance.ts [options]
 *
 * 参数:
 *   --source=youtube|github   指定数据源（默认两者都处理）
 *   --limit=N                 限制处理数量
 *   --person=NAME             只处理指定人物
 *   --threshold=N             可疑阈值，1-5分以下标记为可疑（默认3）
 *   --output=FILE             输出文件名（默认 audit_report_TIMESTAMP.csv）
 *   --quiet                   静默模式，减少输出
 */

import 'dotenv/config';
import { prisma } from '../../lib/db/prisma';
import { chatStructuredCompletion, type ChatMessage } from '../../lib/ai/deepseek';
import * as fs from 'fs';
import * as path from 'path';

interface AuditResult {
  score: number;        // 1-5分，5=确定相关，1=确定不相关
  reason: string;       // 判断理由
  isPersonContent: boolean;  // 是否是本人创作/参与的内容
}

interface AuditRecord {
  personId: string;
  personName: string;
  personOrg: string;
  sourceType: string;
  itemId: string;
  title: string;
  url: string;
  publishedAt: string;
  score: number;
  reason: string;
  isPersonContent: boolean;
  metadata: string;
}

/**
 * 使用 LLM 评估数据相关性
 */
async function auditRelevance(
  personName: string,
  personBio: string,
  personOrg: string,
  sourceType: 'youtube' | 'github',
  title: string,
  url: string,
  metadata: Record<string, any>
): Promise<AuditResult> {
  const systemPrompt = `你是一个数据质量审核专家。你的任务是判断一条 ${sourceType === 'youtube' ? 'YouTube 视频' : 'GitHub 仓库'} 记录是否与指定的 AI 领域人物相关。

评分标准 (1-5分):
5分 - 确定相关: 标题明确包含人物名，且是本人演讲/采访/创作/拥有的内容
4分 - 很可能相关: 标题提及人物或其作品，内容应该与本人相关
3分 - 可能相关: 无法确定，需要人工核实（如同名可能性、第三方内容等）
2分 - 很可能不相关: 看起来是同名他人或无关内容
1分 - 确定不相关: 明显是其他人或完全无关的内容（如不同领域、不同语言的同名者）

${sourceType === 'youtube' ? `
YouTube 特别注意:
- 非拉丁/非中文标题（如泰文、越南文）可能是同名他人的内容
- 第三方制作的分析/介绍视频属于相关内容，但要标注 isPersonContent=false
- 本人演讲/采访/官方频道内容标注 isPersonContent=true
` : `
GitHub 特别注意:
- 检查仓库所有者用户名是否与人物名匹配
- 同名用户很常见，需要判断是否是 AI 领域专业人士的账号
- 个人学习项目、无关领域项目可能是同名他人
`}

返回 JSON: { "score": 1-5, "reason": "判断理由（简洁，20字内）", "isPersonContent": true/false }`;

  const contextInfo = sourceType === 'youtube'
    ? `缩略图: ${metadata.thumbnailUrl || '无'}
频道/作者: ${metadata.author || '未知'}
是否官方频道: ${metadata.isOfficial ? '是' : '否'}`
    : `仓库所有者: ${url.split('/')[3] || '未知'}
描述: ${metadata.description || '无'}`;

  const userPrompt = `人物信息:
- 姓名: ${personName}
- 简介: ${personBio || '无'}
- 当前机构: ${personOrg || '未知'}

${sourceType === 'youtube' ? 'YouTube 视频' : 'GitHub 仓库'}:
- 标题: ${title}
- URL: ${url}
${contextInfo}

请评估这条记录是否与该人物相关。`;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ];

  try {
    const result = await chatStructuredCompletion<AuditResult>(messages, {
      temperature: 0.1,
      maxTokens: 150
    });

    return {
      score: Math.min(5, Math.max(1, result.score || 3)),
      reason: (result.reason || '').slice(0, 50),
      isPersonContent: result.isPersonContent ?? false
    };
  } catch (error) {
    console.error('  LLM 审核失败:', error);
    return { score: 3, reason: 'LLM调用失败，需人工审核', isPersonContent: false };
  }
}

/**
 * 批量审核一个人物的所有数据
 */
async function auditPersonItems(
  person: { id: string; name: string; description: string | null; organization: string | null },
  items: Array<{ id: string; title: string; url: string; sourceType: string; publishedAt: Date | null; metadata: any }>,
  quiet: boolean
): Promise<AuditRecord[]> {
  const results: AuditRecord[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];

    if (!quiet) {
      console.log(`  [${i + 1}/${items.length}] ${item.title.slice(0, 40)}...`);
    }

    const auditResult = await auditRelevance(
      person.name,
      person.description || '',
      person.organization || '',
      item.sourceType as 'youtube' | 'github',
      item.title,
      item.url,
      item.metadata || {}
    );

    results.push({
      personId: person.id,
      personName: person.name,
      personOrg: person.organization || '',
      sourceType: item.sourceType,
      itemId: item.id,
      title: item.title,
      url: item.url,
      publishedAt: item.publishedAt?.toISOString() || '',
      score: auditResult.score,
      reason: auditResult.reason,
      isPersonContent: auditResult.isPersonContent,
      metadata: JSON.stringify(item.metadata || {}).slice(0, 200)
    });

    if (!quiet && auditResult.score <= 3) {
      console.log(`    ⚠️ 评分: ${auditResult.score}/5 - ${auditResult.reason}`);
    }

    // 限速，避免 API 过载
    await new Promise(r => setTimeout(r, 200));
  }

  return results;
}

function escapeCsv(field: any): string {
  if (field === null || field === undefined) return '';
  const stringField = String(field);
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }
  return stringField;
}

async function main() {
  const args = process.argv.slice(2);

  // 解析参数
  const sourceArg = args.find(a => a.startsWith('--source='));
  const limitArg = args.find(a => a.startsWith('--limit='));
  const personArg = args.find(a => a.startsWith('--person='));
  const thresholdArg = args.find(a => a.startsWith('--threshold='));
  const outputArg = args.find(a => a.startsWith('--output='));
  const quiet = args.includes('--quiet');

  const sourceFilter = sourceArg?.split('=')[1] as 'youtube' | 'github' | undefined;
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const personFilter = personArg?.split('=')[1];
  const threshold = thresholdArg ? parseInt(thresholdArg.split('=')[1]) : 3;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const outputFile = outputArg?.split('=')[1] || `audit_report_${timestamp}.csv`;

  console.log('🔍 RawPoolItem 相关性审核\n');
  console.log(`数据源: ${sourceFilter || 'youtube + github'}`);
  console.log(`可疑阈值: ${threshold}分以下`);
  console.log(`输出文件: ${outputFile}\n`);

  // 1. 获取所有人物
  const whereClause: any = {};
  if (personFilter) {
    whereClause.name = { contains: personFilter, mode: 'insensitive' };
  }

  const people = await prisma.people.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      description: true,
      organization: true
    },
    orderBy: { name: 'asc' }
  });

  console.log(`📋 找到 ${people.length} 个人物\n`);

  // 2. 逐人物处理
  const allResults: AuditRecord[] = [];
  let processedCount = 0;
  let totalItems = 0;

  for (const person of people) {
    // 获取该人物的 YouTube/GitHub 数据
    const itemWhere: any = {
      personId: person.id,
      sourceType: sourceFilter ? { equals: sourceFilter } : { in: ['youtube', 'github'] }
    };

    const items = await prisma.rawPoolItem.findMany({
      where: itemWhere,
      select: {
        id: true,
        title: true,
        url: true,
        sourceType: true,
        publishedAt: true,
        metadata: true
      },
      orderBy: { publishedAt: 'desc' },
      take: limit
    });

    if (items.length === 0) continue;

    console.log(`\n👤 ${person.name} (${items.length} 条记录)`);

    const personResults = await auditPersonItems(
      { id: person.id, name: person.name, description: person.description, organization: person.organization },
      items as any,
      quiet
    );

    allResults.push(...personResults);
    processedCount++;
    totalItems += items.length;

    // 每处理10个人输出一次进度
    if (quiet && processedCount % 10 === 0) {
      console.log(`进度: ${processedCount}/${people.length} 人物, ${totalItems} 条记录`);
    }
  }

  // 3. 生成报告
  console.log('\n📊 生成审核报告...\n');

  // 统计
  const suspicious = allResults.filter(r => r.score <= threshold);
  const byScore: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  allResults.forEach(r => byScore[r.score]++);

  console.log(`总记录数: ${allResults.length}`);
  console.log(`可疑记录 (≤${threshold}分): ${suspicious.length}`);
  console.log('\n评分分布:');
  console.log(`  5分 (确定相关): ${byScore[5]}`);
  console.log(`  4分 (很可能相关): ${byScore[4]}`);
  console.log(`  3分 (待确认): ${byScore[3]}`);
  console.log(`  2分 (很可能不相关): ${byScore[2]}`);
  console.log(`  1分 (确定不相关): ${byScore[1]}`);

  // 确保 exports 目录存在
  const exportsDir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(exportsDir)) {
    fs.mkdirSync(exportsDir, { recursive: true });
  }

  // 写入 CSV（只包含可疑记录，供人工审核）
  const header = [
    'personName', 'personOrg', 'sourceType', 'title', 'url',
    'publishedAt', 'score', 'reason', 'isPersonContent',
    'action', 'personId', 'itemId'
  ];

  // 按评分排序，最可疑的在前面
  suspicious.sort((a, b) => a.score - b.score);

  const rows = suspicious.map(r => [
    r.personName,
    r.personOrg,
    r.sourceType,
    r.title,
    r.url,
    r.publishedAt,
    r.score,
    r.reason,
    r.isPersonContent ? '是' : '否',
    '',  // action 列留空，供人工填写: keep/delete
    r.personId,
    r.itemId
  ].map(escapeCsv).join(','));

  const csvContent = '\uFEFF' + [header.join(','), ...rows].join('\n');
  const outputPath = path.join(exportsDir, outputFile);
  fs.writeFileSync(outputPath, csvContent);

  console.log(`\n✅ 审核报告已保存: ${outputPath}`);
  console.log(`\n📝 使用说明:`);
  console.log(`1. 打开 CSV 文件，检查可疑记录`);
  console.log(`2. 在 'action' 列填写: keep(保留) 或 delete(删除)`);
  console.log(`3. 保存后运行清理脚本: npx tsx scripts/audit/apply_audit_cleanup.ts --input=${outputFile}`);

  // 同时保存完整报告（用于分析）
  const fullReportFile = outputFile.replace('.csv', '_full.csv');
  const fullRows = allResults
    .sort((a, b) => a.score - b.score)
    .map(r => [
      r.personName, r.personOrg, r.sourceType, r.title, r.url,
      r.publishedAt, r.score, r.reason, r.isPersonContent ? '是' : '否',
      '', r.personId, r.itemId
    ].map(escapeCsv).join(','));

  const fullCsvContent = '\uFEFF' + [header.join(','), ...fullRows].join('\n');
  const fullOutputPath = path.join(exportsDir, fullReportFile);
  fs.writeFileSync(fullOutputPath, fullCsvContent);
  console.log(`\n📄 完整报告: ${fullOutputPath}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
