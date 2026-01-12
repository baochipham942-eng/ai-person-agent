/**
 * 计算各话题的人物全局排名
 * 基于 influenceScore 对每个话题下的人物进行排序
 *
 * 用法: npx tsx scripts/enrich/calculate_topic_ranks.ts
 */

import { prisma } from '../../lib/db/prisma';

async function main() {
  console.log('🏆 开始计算话题排名...\n');

  // 1. 获取所有人物的 topics 和 influenceScore
  const people = await prisma.people.findMany({
    where: {
      topics: { isEmpty: false }
    },
    select: {
      id: true,
      name: true,
      topics: true,
      influenceScore: true,
    },
    orderBy: { influenceScore: 'desc' }
  });

  console.log(`📋 找到 ${people.length} 个有话题标签的人物\n`);

  // 2. 收集所有唯一话题
  const allTopics = new Set<string>();
  for (const person of people) {
    for (const topic of person.topics) {
      allTopics.add(topic);
    }
  }
  console.log(`📚 共有 ${allTopics.size} 个唯一话题\n`);

  // 3. 对每个话题计算排名
  const topicRankings: Record<string, { personId: string; rank: number }[]> = {};

  for (const topic of allTopics) {
    // 过滤出拥有该话题的人物，已按 influenceScore 排序
    const peopleWithTopic = people.filter(p => p.topics.includes(topic));

    topicRankings[topic] = peopleWithTopic.map((p, index) => ({
      personId: p.id,
      rank: index + 1
    }));

    console.log(`  ${topic}: ${peopleWithTopic.length} 人`);
  }

  // 4. 构建每个人物的 topicRanks 并更新
  console.log('\n📝 更新人物话题排名...\n');

  let updatedCount = 0;
  for (const person of people) {
    const topicRanks: Record<string, number> = {};

    for (const topic of person.topics) {
      const ranking = topicRankings[topic]?.find(r => r.personId === person.id);
      if (ranking) {
        topicRanks[topic] = ranking.rank;
      }
    }

    // 更新数据库
    await prisma.people.update({
      where: { id: person.id },
      data: { topicRanks }
    });

    updatedCount++;
    if (updatedCount % 20 === 0) {
      console.log(`  已更新 ${updatedCount}/${people.length} 人物`);
    }
  }

  console.log(`\n✅ 完成！共更新 ${updatedCount} 个人物的话题排名`);

  // 5. 输出 Top 3 排名示例
  console.log('\n📊 示例：各话题 Top 3 人物\n');

  const topTopics = ['大语言模型', 'Scaling', 'Agent', 'AGI', '对齐'];
  for (const topic of topTopics) {
    if (topicRankings[topic]) {
      console.log(`${topic}:`);
      const top3 = topicRankings[topic].slice(0, 3);
      for (const { personId, rank } of top3) {
        const person = people.find(p => p.id === personId);
        console.log(`  #${rank} ${person?.name} (影响力: ${person?.influenceScore?.toFixed(1)})`);
      }
      console.log('');
    }
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
