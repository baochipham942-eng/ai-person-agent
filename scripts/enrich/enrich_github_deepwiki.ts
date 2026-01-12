/**
 * 使用 DeepWiki 丰富 GitHub 开源项目信息
 *
 * DeepWiki (https://deepwiki.com) 可以生成仓库的智能摘要和文档
 * 这个脚本会：
 * 1. 获取所有已有的 GitHub 仓库记录
 * 2. 对每个仓库调用 DeepWiki API 获取摘要
 * 3. 将摘要存储到 metadata.deepwikiSummary 字段
 *
 * 用法：npx tsx scripts/enrich/enrich_github_deepwiki.ts
 */

import { prisma } from '../../lib/db/prisma';

const DEEPWIKI_API_URL = 'https://api.deepwiki.com/v1';  // 假设的 API 地址
const DEEPWIKI_API_KEY = process.env.DEEPWIKI_API_KEY;

// 备选方案：直接抓取 DeepWiki 页面
const DEEPWIKI_WEB_URL = 'https://deepwiki.com';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 从 GitHub URL 提取 owner/repo
 */
function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
  if (match) {
    return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
  }
  return null;
}

/**
 * 通过 WebFetch 获取 DeepWiki 摘要（如果没有 API）
 * DeepWiki 的 URL 格式: https://deepwiki.com/owner/repo
 */
async function fetchDeepWikiSummary(owner: string, repo: string): Promise<string | null> {
  try {
    // 尝试使用 API（如果有的话）
    if (DEEPWIKI_API_KEY) {
      const response = await fetch(`${DEEPWIKI_API_URL}/repos/${owner}/${repo}/summary`, {
        headers: {
          'Authorization': `Bearer ${DEEPWIKI_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.summary || null;
      }
    }

    // 备选方案：直接获取 DeepWiki 页面内容
    const deepwikiUrl = `${DEEPWIKI_WEB_URL}/${owner}/${repo}`;
    const response = await fetch(deepwikiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AIPersonAgent/1.0)',
      },
    });

    if (!response.ok) {
      console.log(`  DeepWiki page not found for ${owner}/${repo}`);
      return null;
    }

    const html = await response.text();

    // 尝试从页面提取摘要（DeepWiki 通常会有一个概述区域）
    // 提取 meta description - 注意 content 后面是双引号
    const summaryMatch = html.match(/<meta name="description" content="([^"]{50,})"/);
    if (summaryMatch && !summaryMatch[1].includes('DeepWiki provides up-to-date')) {
      return summaryMatch[1];
    }

    // 尝试提取 og:description
    const ogMatch = html.match(/<meta property="og:description" content="([^"]{50,})"/);
    if (ogMatch && !ogMatch[1].includes('DeepWiki provides up-to-date')) {
      return ogMatch[1];
    }

    // 尝试提取 title 作为备用（去掉 | DeepWiki 后缀）
    const titleMatch = html.match(/<title>([^<]+)\s*\|\s*DeepWiki<\/title>/);
    if (titleMatch) {
      return `${titleMatch[1]} - Open source project`;
    }

    return null;
  } catch (error) {
    console.error(`  Error fetching DeepWiki for ${owner}/${repo}:`, error);
    return null;
  }
}

/**
 * 使用 AI 生成仓库摘要（备选方案）
 */
async function generateRepoSummary(repoName: string, description: string): Promise<string> {
  // 如果 DeepWiki 不可用，可以使用现有的 AI 服务生成简短摘要
  // 这里简单返回 description，实际可以调用 DeepSeek 等
  if (!description || description.length < 50) {
    return description || `${repoName} 是一个开源项目`;
  }

  // 截取前 200 字符作为摘要
  return description.length > 200
    ? description.slice(0, 200) + '...'
    : description;
}

async function main() {
  console.log('=== Enriching GitHub Repos with DeepWiki ===\n');

  // 获取所有 GitHub 仓库记录
  const githubItems = await prisma.rawPoolItem.findMany({
    where: {
      sourceType: 'github',
    },
    include: {
      person: {
        select: { name: true },
      },
    },
    orderBy: { fetchedAt: 'desc' },
    take: 100,  // 每次处理 100 个
  });

  console.log(`Found ${githubItems.length} GitHub repos to process\n`);

  let enrichedCount = 0;
  let skippedCount = 0;

  for (const item of githubItems) {
    const metadata = item.metadata as any || {};

    // 跳过已经有 DeepWiki 摘要的
    if (metadata.deepwikiSummary) {
      skippedCount++;
      continue;
    }

    const parsed = parseGitHubUrl(item.url);
    if (!parsed) {
      console.log(`  Skipping invalid URL: ${item.url}`);
      continue;
    }

    console.log(`Processing: ${parsed.owner}/${parsed.repo} (${item.person?.name})`);

    // 尝试获取 DeepWiki 摘要
    let summary = await fetchDeepWikiSummary(parsed.owner, parsed.repo);

    // 如果 DeepWiki 没有数据，使用原有描述
    if (!summary) {
      summary = await generateRepoSummary(item.title, item.text);
    }

    if (summary) {
      // 更新 metadata
      await prisma.rawPoolItem.update({
        where: { id: item.id },
        data: {
          metadata: {
            ...metadata,
            deepwikiSummary: summary,
            deepwikiEnrichedAt: new Date().toISOString(),
          },
        },
      });

      console.log(`  ✓ Added summary: ${summary.slice(0, 60)}...`);
      enrichedCount++;
    }

    // Rate limiting
    await sleep(1000);
  }

  console.log(`\n=== Completed ===`);
  console.log(`Enriched: ${enrichedCount}`);
  console.log(`Skipped (already has summary): ${skippedCount}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
