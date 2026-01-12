/**
 * 从 RawPoolItem 提取 GitHub 项目数据填充 People.products 字段
 *
 * 运行: npx tsx scripts/enrich/enrich_products.ts
 */

import { prisma } from '../../lib/db/prisma';

interface Product {
  name: string;
  description: string;
  url: string;
  type: 'github' | 'paper' | 'course' | 'tool' | 'other';
  year?: number;
  stats?: {
    stars?: number;
    forks?: number;
    citations?: number;
  };
  language?: string;
  icon?: string;
}

async function enrichProducts() {
  console.log('开始填充 products 字段...\n');

  // 获取所有有 GitHub 数据的人物
  const peopleWithGithub = await prisma.people.findMany({
    where: {
      rawPoolItems: {
        some: { sourceType: 'github' }
      }
    },
    select: {
      id: true,
      name: true,
      products: true,
    }
  });

  console.log(`找到 ${peopleWithGithub.length} 个有 GitHub 数据的人物\n`);

  let updatedCount = 0;

  for (const person of peopleWithGithub) {
    // 获取该人物的 GitHub 项目，按 stars 排序
    const githubItems = await prisma.rawPoolItem.findMany({
      where: {
        personId: person.id,
        sourceType: 'github'
      },
      orderBy: { fetchedAt: 'desc' }
    });

    if (githubItems.length === 0) continue;

    // 转换为 Product 格式，按 stars 排序取前 10 个
    const products: Product[] = githubItems
      .map(item => {
        const metadata = (item.metadata as any) || {};
        return {
          name: item.title,
          description: item.text || '',
          url: item.url,
          type: 'github' as const,
          year: item.publishedAt ? new Date(item.publishedAt).getFullYear() : undefined,
          stats: {
            stars: metadata.stars || 0,
            forks: metadata.forks || 0,
          },
          language: metadata.language || undefined,
          icon: '💻',
        };
      })
      .sort((a, b) => (b.stats?.stars || 0) - (a.stats?.stars || 0))
      .slice(0, 10); // 只保留前 10 个

    // 更新数据库
    await prisma.people.update({
      where: { id: person.id },
      data: { products: products as any }
    });

    const topProduct = products[0];
    console.log(`✅ ${person.name}: ${products.length} 个产品，最热门: ${topProduct.name} (${topProduct.stats?.stars} stars)`);
    updatedCount++;
  }

  console.log(`\n完成! 更新了 ${updatedCount} 个人物的 products 字段`);
}

enrichProducts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
