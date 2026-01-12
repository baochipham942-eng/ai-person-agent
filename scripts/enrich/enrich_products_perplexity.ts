/**
 * 使用 Perplexity API 自动补充人物产品数据
 *
 * 运行: npx tsx scripts/enrich/enrich_products_perplexity.ts [--limit=N] [--quiet]
 *
 * 选项:
 *   --limit=N  限制处理人数（默认处理所有缺少产品的 ready 人物）
 *   --quiet    静默模式，减少输出
 *   --force    强制更新（即使已有产品数据）
 */

import { prisma } from '../../lib/db/prisma';
import { searchPerplexity } from '../../lib/datasources/perplexity';

interface Product {
  name: string;
  org?: string;
  year?: string | number;
  description: string;
  url?: string;
  icon?: string;
  category?: string;
  stats?: {
    users?: string;
    revenue?: string;
    valuation?: string;
    downloads?: string;
  };
  role?: string;
}

// 解析命令行参数
const args = process.argv.slice(2);
const quiet = args.includes('--quiet');
const force = args.includes('--force');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

const log = (msg: string) => { if (!quiet) console.log(msg); };

// Perplexity 查询 prompt
const SYSTEM_PROMPT = `You are a precise research assistant. Your task is to identify AI products, platforms, services, or frameworks that a person has created, co-created, or significantly contributed to.

IMPORTANT: Focus on REAL PRODUCTS, not research papers or GitHub repositories.

Respond ONLY in valid JSON format with this structure:
{
  "products": [
    {
      "name": "Product Name",
      "org": "Organization",
      "year": 2023,
      "description": "Brief description (1-2 sentences)",
      "url": "https://...",
      "category": "AI Model|Platform|Tool|Framework|Service|Hardware",
      "stats": { "users": "10M+", "revenue": "$1B ARR" },
      "role": "founder|co-creator|lead|contributor"
    }
  ]
}

Categories:
- AI Model: LLMs, image/video generation models (GPT-4, Claude, Gemini, DALL-E)
- Platform: AI platforms, APIs, apps (ChatGPT, Perplexity, Hugging Face)
- Tool: Developer tools (GitHub Copilot, Cursor)
- Framework: ML frameworks, libraries (PyTorch, TensorFlow, LangChain)
- Service: Commercial AI services (Azure OpenAI, AWS Bedrock)
- Hardware: AI chips, accelerators (H100, TPU)

If no products found, return: {"products": []}`;

async function queryPerplexityForProducts(personName: string, org: string[]): Promise<Product[]> {
  const orgContext = org.length > 0 ? ` (associated with ${org.slice(0, 3).join(', ')})` : '';
  const query = `List the main AI products, platforms, or services that ${personName}${orgContext} created, co-created, or significantly contributed to.

Focus on:
1. Commercial products (ChatGPT, Claude, Gemini, etc.)
2. AI platforms and APIs
3. Open-source frameworks (PyTorch, TensorFlow, LangChain)
4. AI tools and applications

DO NOT include:
- Research papers
- GitHub repositories (unless they're major frameworks)
- Academic projects

For each product, provide: name, organization, year launched, brief description, URL, category, and any known metrics (users, revenue, etc.).`;

  try {
    const response = await searchPerplexity(query, SYSTEM_PROMPT, {
      temperature: 0.1,
      return_citations: true,
    });

    // 解析 JSON 响应
    const content = response.content;

    // 尝试提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      log(`  ⚠️ 无法解析响应 JSON`);
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const products = parsed.products || [];

    // 验证和清洗数据
    return products
      .filter((p: any) => p.name && p.description)
      .map((p: any) => ({
        name: p.name,
        org: p.org || undefined,
        year: p.year || undefined,
        description: p.description,
        url: p.url || undefined,
        icon: getIconForCategory(p.category),
        category: p.category || undefined,
        stats: p.stats || undefined,
        role: p.role || undefined,
      }));

  } catch (error) {
    log(`  ❌ Perplexity API 错误: ${error}`);
    return [];
  }
}

function getIconForCategory(category?: string): string {
  const icons: Record<string, string> = {
    'AI Model': '🧠',
    'Platform': '🚀',
    'Tool': '🔧',
    'Framework': '📦',
    'Service': '☁️',
    'Hardware': '💻',
  };
  return icons[category || ''] || '🤖';
}

async function enrichProductsPerplexity() {
  console.log('使用 Perplexity 补充产品数据...\n');

  // 查询需要补充产品的人物
  const whereCondition = force
    ? { status: 'ready' }
    : {
        status: 'ready',
        OR: [
          { products: null },
          { products: { equals: [] } },
        ],
      };

  const people = await prisma.people.findMany({
    where: whereCondition,
    select: {
      id: true,
      name: true,
      organization: true,
      products: true,
    },
    orderBy: { influenceScore: 'desc' },
    take: limit,
  });

  console.log(`找到 ${people.length} 个需要补充产品的人物${limit ? ` (限制 ${limit})` : ''}\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < people.length; i++) {
    const person = people[i];

    if (quiet && i % 5 === 0) {
      console.log(`进度: ${i}/${people.length}`);
    }

    log(`[${i + 1}/${people.length}] 处理: ${person.name}`);

    try {
      // 查询 Perplexity
      const newProducts = await queryPerplexityForProducts(person.name, person.organization);

      if (newProducts.length === 0) {
        log(`  ⏭️ 未找到产品`);
        skippedCount++;
        continue;
      }

      // 获取现有产品（过滤 GitHub 类型）
      const existingProducts = ((person.products as Product[]) || []).filter(
        p => (p as any).type !== 'github' && !(p.url && p.url.includes('github.com'))
      );

      // 合并去重
      const existingNames = new Set(existingProducts.map(p => p.name.toLowerCase()));
      const uniqueNewProducts = newProducts.filter(p => !existingNames.has(p.name.toLowerCase()));

      if (uniqueNewProducts.length === 0) {
        log(`  ⏭️ 无新产品（已有 ${existingProducts.length} 个）`);
        skippedCount++;
        continue;
      }

      const mergedProducts = [...existingProducts, ...uniqueNewProducts];

      // 更新数据库
      await prisma.people.update({
        where: { id: person.id },
        data: { products: mergedProducts as any },
      });

      log(`  ✅ 添加 ${uniqueNewProducts.length} 个产品: ${uniqueNewProducts.map(p => p.name).join(', ')}`);
      updatedCount++;

      // API 限流：每次请求后等待一小段时间
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      log(`  ❌ 错误: ${error}`);
      errorCount++;
    }
  }

  console.log(`\n📊 完成统计:`);
  console.log(`  ✅ 更新: ${updatedCount} 人`);
  console.log(`  ⏭️ 跳过: ${skippedCount} 人`);
  console.log(`  ❌ 错误: ${errorCount} 人`);
}

enrichProductsPerplexity()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
