/**
 * 去掉 Boris Cherny 人物记录里的「开源」标签。
 * 原因：Boris 的开源身份来自他 Anthropic 之前的 TypeScript 开源库（json-schema-to-typescript 等），
 * 而当前主线 Claude Code 是闭源产品；把「开源」挂在他当前卡片上会误导读者以为 Claude Code 开源。
 * 幂等：topics 里没有「开源」时直接跳过。
 */
import { prisma } from '../../lib/db/prisma';

const BORIS_ID = 'cmjxmgs83000011y3v2qj1z51';
const REMOVE_TOPIC = '开源';

async function main() {
  const person = await prisma.people.findUnique({
    where: { id: BORIS_ID },
    select: { id: true, name: true, topics: true },
  });

  if (!person) {
    console.error(`未找到人物 ${BORIS_ID}`);
    process.exit(1);
  }

  if (!person.topics.includes(REMOVE_TOPIC)) {
    console.log(`✅ ${person.name} topics 已无「${REMOVE_TOPIC}」，跳过：`, person.topics);
    return;
  }

  const next = person.topics.filter(topic => topic !== REMOVE_TOPIC);
  await prisma.people.update({ where: { id: BORIS_ID }, data: { topics: next } });
  console.log(`✅ ${person.name} topics 已更新：`, person.topics, '->', next);
}

main()
  .catch(error => {
    console.error('脚本失败:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
