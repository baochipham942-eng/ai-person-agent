/**
 * 计算人物综合影响力分数
 *
 * 影响力公式（简化版）：
 * Score = 内容丰富度 × 0.3 + GitHub Stars × 0.25 + 学术指标 × 0.25 + AI评估 × 0.2
 *
 * 各维度归一化到 0-100 分
 *
 * 用法: bun scripts/enrich/calculate_influence.ts [--limit N]
 */

import { prisma } from '../../lib/db/prisma';

interface InfluenceFactors {
  contentRichness: number;  // 内容丰富度 (0-100)
  githubScore: number;      // GitHub 影响力 (0-100)
  academicScore: number;    // 学术影响力 (0-100)
  aiScore: number;          // AI 贡献评分 (0-100)
}

/**
 * 计算内容丰富度分数
 * 基于 RawPoolItem 和 Card 数量
 */
async function calculateContentRichness(personId: string): Promise<number> {
  const [rawPoolCount, cardCount] = await Promise.all([
    prisma.rawPoolItem.count({ where: { personId } }),
    prisma.card.count({ where: { personId } })
  ]);

  // 基准：10 个 RawPoolItem = 50 分，20 个 = 80 分，30+ = 100 分
  // Card 每个加 5 分，最多 20 分
  const rawScore = Math.min(100, rawPoolCount * 3.3);
  const cardScore = Math.min(20, cardCount * 5);

  return Math.min(100, rawScore + cardScore);
}

/**
 * 聚合 GitHub stars 并计算分数
 */
async function calculateGitHubScore(personId: string): Promise<{ stars: number; score: number }> {
  // 从 RawPoolItem 中获取 GitHub 数据
  const githubItems = await prisma.rawPoolItem.findMany({
    where: {
      personId,
      sourceType: 'github'
    },
    select: {
      metadata: true
    }
  });

  // 聚合所有仓库的 stars
  let totalStars = 0;
  for (const item of githubItems) {
    const metadata = item.metadata as { stars?: number } | null;
    if (metadata?.stars) {
      totalStars += metadata.stars;
    }
  }

  // 归一化：10K stars = 50 分，50K = 80 分，100K+ = 100 分
  // 使用对数缩放避免极端值主导
  let score = 0;
  if (totalStars > 0) {
    score = Math.min(100, Math.log10(totalStars + 1) * 20);
  }

  return { stars: totalStars, score };
}

/**
 * 计算学术影响力分数
 * 基于引用数和 h-index
 */
function calculateAcademicScore(citationCount: number, hIndex: number): number {
  // 引用数：10K = 50 分，50K = 80 分，100K+ = 100 分
  const citationScore = citationCount > 0
    ? Math.min(100, Math.log10(citationCount + 1) * 20)
    : 0;

  // h-index：30 = 50 分，50 = 80 分，80+ = 100 分
  const hIndexScore = Math.min(100, hIndex * 1.25);

  // 加权平均：引用数 60%，h-index 40%
  return citationScore * 0.6 + hIndexScore * 0.4;
}

/**
 * 将 AI 贡献评分转换为 0-100
 */
function normalizeAiScore(aiContributionScore: number): number {
  // 原始分数 0-10，转换为 0-100
  return aiContributionScore * 10;
}

/**
 * 计算综合影响力分数
 */
function calculateFinalScore(factors: InfluenceFactors): number {
  const weights = {
    contentRichness: 0.30,
    githubScore: 0.25,
    academicScore: 0.25,
    aiScore: 0.20
  };

  return (
    factors.contentRichness * weights.contentRichness +
    factors.githubScore * weights.githubScore +
    factors.academicScore * weights.academicScore +
    factors.aiScore * weights.aiScore
  );
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

  console.log('📊 开始计算综合影响力分数...\n');

  // 获取所有人物
  const people = await prisma.people.findMany({
    select: {
      id: true,
      name: true,
      citationCount: true,
      hIndex: true,
      aiContributionScore: true,
      githubStars: true,
    },
    take: limit,
    orderBy: { aiContributionScore: 'desc' }
  });

  console.log(`📋 处理 ${people.length} 个人物\n`);

  const results: Array<{
    name: string;
    factors: InfluenceFactors;
    finalScore: number;
    githubStars: number;
  }> = [];

  for (let i = 0; i < people.length; i++) {
    const person = people[i];
    process.stdout.write(`\r[${i + 1}/${people.length}] 处理: ${person.name.padEnd(20)}`);

    try {
      // 计算各维度分数
      const contentRichness = await calculateContentRichness(person.id);
      const { stars: githubStars, score: githubScore } = await calculateGitHubScore(person.id);
      const academicScore = calculateAcademicScore(person.citationCount, person.hIndex);
      const aiScore = normalizeAiScore(person.aiContributionScore);

      const factors: InfluenceFactors = {
        contentRichness,
        githubScore,
        academicScore,
        aiScore
      };

      const finalScore = calculateFinalScore(factors);

      // 更新数据库
      await prisma.people.update({
        where: { id: person.id },
        data: {
          githubStars,
          influenceScore: Math.round(finalScore * 100) / 100
        }
      });

      results.push({
        name: person.name,
        factors,
        finalScore,
        githubStars
      });

    } catch (error) {
      console.error(`\n  ❌ ${person.name} 失败: ${error}`);
    }
  }

  console.log('\n\n📊 影响力排行榜 (Top 20):\n');

  // 排序并显示 Top 20
  results
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 20)
    .forEach((r, i) => {
      console.log(`${(i + 1).toString().padStart(2)}. ${r.name.padEnd(20)} | 总分: ${r.finalScore.toFixed(1).padStart(5)}`);
      console.log(`    内容: ${r.factors.contentRichness.toFixed(0).padStart(3)} | GitHub: ${r.factors.githubScore.toFixed(0).padStart(3)} (${r.githubStars.toLocaleString()} ⭐) | 学术: ${r.factors.academicScore.toFixed(0).padStart(3)} | AI: ${r.factors.aiScore.toFixed(0).padStart(3)}`);
    });

  console.log('\n✅ 影响力计算完成');
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
