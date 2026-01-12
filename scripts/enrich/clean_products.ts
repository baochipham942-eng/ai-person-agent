/**
 * 清洗产品数据：分离 GitHub 仓库和真实产品
 *
 * 功能：
 * 1. 将 products 字段中的 GitHub 仓库类型数据清除（这些应该从 RawPoolItem 加载）
 * 2. 规范化产品类别
 * 3. 去重和合并
 *
 * 运行: npx tsx scripts/enrich/clean_products.ts [--dry-run] [--quiet]
 *
 * 选项:
 *   --dry-run  仅预览，不实际修改数据库
 *   --quiet    静默模式
 */

import { prisma } from '../../lib/db/prisma';

interface Product {
  name: string;
  org?: string;
  year?: string | number;
  description: string;
  url?: string;
  icon?: string;
  type?: string;
  category?: string;
  stats?: Record<string, any>;
  role?: string;
}

// 解析命令行参数
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const quiet = args.includes('--quiet');

const log = (msg: string) => { if (!quiet) console.log(msg); };

// 判断是否为 GitHub 仓库类型
function isGithubProduct(product: Product): boolean {
  // 明确标记为 github 类型
  if (product.type === 'github') return true;

  // URL 包含 github.com
  if (product.url && product.url.includes('github.com')) return true;

  // stats 中有 stars/forks（GitHub 仓库特征）
  if (product.stats && ('stars' in product.stats || 'forks' in product.stats)) {
    // 但要排除大型框架（如 PyTorch 也会有 stars，但它是真实产品）
    const frameworkNames = ['pytorch', 'tensorflow', 'keras', 'fastai', 'langchain', 'llamaindex'];
    const isFramework = frameworkNames.some(f => product.name.toLowerCase().includes(f));
    if (!isFramework) return true;
  }

  return false;
}

// 规范化产品类别
function normalizeCategory(category?: string): string | undefined {
  if (!category) return undefined;

  const normalized = category.toLowerCase().trim();
  const mapping: Record<string, string> = {
    'ai model': 'AI Model',
    'model': 'AI Model',
    'llm': 'AI Model',
    'platform': 'Platform',
    'api': 'Platform',
    'tool': 'Tool',
    'framework': 'Framework',
    'library': 'Framework',
    'service': 'Service',
    'hardware': 'Hardware',
    'chip': 'Hardware',
    'gpu': 'Hardware',
  };

  return mapping[normalized] || category;
}

// 去重产品（同名产品合并）
function deduplicateProducts(products: Product[]): Product[] {
  const seen = new Map<string, Product>();

  for (const product of products) {
    const key = product.name.toLowerCase();
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, product);
    } else {
      // 合并数据，保留更完整的版本
      const merged: Product = {
        ...existing,
        org: existing.org || product.org,
        year: existing.year || product.year,
        description: existing.description.length > product.description.length
          ? existing.description
          : product.description,
        url: existing.url || product.url,
        icon: existing.icon || product.icon,
        category: existing.category || product.category,
        stats: { ...product.stats, ...existing.stats },
        role: existing.role || product.role,
      };
      seen.set(key, merged);
    }
  }

  return Array.from(seen.values());
}

async function cleanProducts() {
  console.log(`清洗产品数据${dryRun ? ' (预览模式)' : ''}...\n`);

  // 获取所有有产品数据的人物
  const people = await prisma.people.findMany({
    where: {
      products: { not: null },
    },
    select: {
      id: true,
      name: true,
      products: true,
    },
  });

  console.log(`找到 ${people.length} 个有产品数据的人物\n`);

  let cleanedCount = 0;
  let unchangedCount = 0;
  let totalRemoved = 0;

  for (const person of people) {
    const products = (person.products as Product[]) || [];

    if (products.length === 0) {
      unchangedCount++;
      continue;
    }

    // 1. 过滤掉 GitHub 仓库类型
    const nonGithubProducts = products.filter(p => !isGithubProduct(p));
    const removedCount = products.length - nonGithubProducts.length;

    // 2. 规范化类别
    const normalizedProducts = nonGithubProducts.map(p => ({
      ...p,
      category: normalizeCategory(p.category),
    }));

    // 3. 去重
    const cleanedProducts = deduplicateProducts(normalizedProducts);

    // 检查是否有变化
    const hasChanges = removedCount > 0 ||
      JSON.stringify(products) !== JSON.stringify(cleanedProducts);

    if (!hasChanges) {
      unchangedCount++;
      continue;
    }

    log(`${person.name}: ${products.length} → ${cleanedProducts.length} (移除 ${removedCount} 个 GitHub 项目)`);

    if (cleanedProducts.length > 0) {
      cleanedProducts.forEach(p => {
        log(`  • ${p.name} (${p.category || '未分类'})`);
      });
    }

    // 更新数据库
    if (!dryRun) {
      await prisma.people.update({
        where: { id: person.id },
        data: {
          products: cleanedProducts.length > 0 ? cleanedProducts as any : null,
        },
      });
    }

    cleanedCount++;
    totalRemoved += removedCount;
  }

  console.log(`\n📊 统计:`);
  console.log(`  ✅ 清洗: ${cleanedCount} 人`);
  console.log(`  ⏭️ 无变化: ${unchangedCount} 人`);
  console.log(`  🗑️ 移除 GitHub 项目: ${totalRemoved} 个`);

  if (dryRun) {
    console.log(`\n⚠️ 预览模式，数据库未修改。移除 --dry-run 以执行实际更新。`);
  }
}

cleanProducts()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
