/**
 * P0-2: 修正 YouTube 视频的 isOfficial 标记
 * 问题: 当 author 与人物名/别名匹配时，应标记为 isOfficial=true
 */

import { prisma } from '../../lib/db/prisma';

// 规范化名字用于比较
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z\u4e00-\u9fff]/g, '') // 保留字母和中文
    .trim();
}

// 检查 author 是否匹配人物名或别名
function isAuthorMatch(author: string, personName: string, aliases: string[]): boolean {
  const normalizedAuthor = normalizeName(author);
  const allNames = [personName, ...aliases];

  return allNames.some(name => {
    const normalized = normalizeName(name);
    // 完全匹配或包含匹配
    return normalized === normalizedAuthor ||
           normalizedAuthor.includes(normalized) ||
           normalized.includes(normalizedAuthor);
  });
}

async function main() {
  console.log('🔍 查找需要修正 isOfficial 标记的视频...\n');

  // 获取所有 YouTube 视频
  const videos = await prisma.rawPoolItem.findMany({
    where: { sourceType: 'youtube' },
    include: {
      person: { select: { name: true, aliases: true } }
    }
  });

  console.log(`共 ${videos.length} 个 YouTube 视频\n`);

  const toFix: Array<{
    id: string;
    title: string;
    author: string;
    personName: string;
    currentOfficial: boolean;
  }> = [];

  for (const video of videos) {
    const metadata = video.metadata as Record<string, unknown> | null;
    if (!metadata?.author) continue;

    const author = metadata.author as string;
    const isOfficial = metadata.isOfficial as boolean | undefined;

    // 检查是否匹配但标记为 false
    if (isAuthorMatch(author, video.person.name, video.person.aliases)) {
      if (isOfficial !== true) {
        toFix.push({
          id: video.id,
          title: video.title,
          author,
          personName: video.person.name,
          currentOfficial: isOfficial ?? false
        });
      }
    }
  }

  if (toFix.length === 0) {
    console.log('✅ 没有需要修正的视频');
    return;
  }

  console.log(`发现 ${toFix.length} 个需要修正的视频:\n`);

  for (const item of toFix) {
    console.log(`- ${item.personName}: "${item.title}"`);
    console.log(`  Author: ${item.author}`);
    console.log(`  当前 isOfficial: ${item.currentOfficial} → true`);
    console.log();
  }

  // 执行更新
  let updated = 0;
  for (const item of toFix) {
    const video = videos.find(v => v.id === item.id)!;
    const metadata = video.metadata as Record<string, unknown>;

    await prisma.rawPoolItem.update({
      where: { id: item.id },
      data: {
        metadata: {
          ...metadata,
          isOfficial: true
        }
      }
    });
    updated++;
  }

  console.log(`✅ 已修正 ${updated} 个视频的 isOfficial 标记`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
