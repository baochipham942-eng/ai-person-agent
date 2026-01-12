/**
 * P1-2: 为空内容的 GitHub 记录补充 README
 *
 * 问题: 35个 GitHub 记录内容为空或少于10字符
 * 解决: 调用 GitHub API 获取 README 内容，更新到 text 字段
 *
 * API: GET /repos/{owner}/{repo}/readme
 * 文档: https://docs.github.com/en/rest/repos/contents#get-a-repository-readme
 */

import { prisma } from '../../lib/db/prisma';

const GITHUB_API_URL = 'https://api.github.com';
const MIN_TEXT_LENGTH = 10;

async function fetchReadme(owner: string, repo: string): Promise<string | null> {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'AI-Person-Agent',
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const response = await fetch(
      `${GITHUB_API_URL}/repos/${owner}/${repo}/readme`,
      { headers }
    );

    if (!response.ok) {
      if (response.status === 404) {
        // 没有 README
        return null;
      }
      console.warn(`[GitHub] Failed to fetch README for ${owner}/${repo}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    // README 内容是 base64 编码的
    if (data.content && data.encoding === 'base64') {
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      // 限制长度，只取前 2000 字符
      return content.slice(0, 2000);
    }

    return null;
  } catch (error) {
    console.error(`[GitHub] Error fetching README for ${owner}/${repo}:`, error);
    return null;
  }
}

function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  // https://github.com/owner/repo
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (match) {
    return { owner: match[1], repo: match[2] };
  }
  return null;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  if (dryRun) {
    console.log('🔍 DRY RUN 模式 - 不会实际修改数据\n');
  }

  console.log('🔍 查找空内容的 GitHub 记录...\n');

  // 查找内容为空或过短的 GitHub 记录
  const emptyRecords = await prisma.rawPoolItem.findMany({
    where: {
      sourceType: 'github',
    },
    include: {
      person: { select: { name: true } }
    }
  });

  // 过滤出真正需要处理的
  const toProcess = emptyRecords.filter(r => r.text.length < MIN_TEXT_LENGTH);

  if (toProcess.length === 0) {
    console.log('✅ 没有需要处理的空内容 GitHub 记录');
    return;
  }

  console.log(`发现 ${toProcess.length} 个空内容记录:\n`);

  let updated = 0;
  let skipped = 0;

  for (const record of toProcess) {
    const parsed = parseGitHubUrl(record.url);
    if (!parsed) {
      console.log(`❌ 无法解析 URL: ${record.url}`);
      skipped++;
      continue;
    }

    console.log(`- ${record.person.name}: ${parsed.owner}/${parsed.repo}`);

    if (dryRun) {
      continue;
    }

    // 限速：每次请求间隔 1 秒
    await new Promise(r => setTimeout(r, 1000));

    const readme = await fetchReadme(parsed.owner, parsed.repo);

    if (readme && readme.length >= MIN_TEXT_LENGTH) {
      // 组合原描述和 README
      const newText = record.text
        ? `${record.text}\n\n---\n\n${readme}`
        : readme;

      await prisma.rawPoolItem.update({
        where: { id: record.id },
        data: { text: newText }
      });

      console.log(`  ✅ 更新成功 (README: ${readme.length} 字符)`);
      updated++;
    } else {
      console.log(`  ⚠️ 无 README 或内容过短`);
      skipped++;
    }
  }

  if (dryRun) {
    console.log(`\n📊 预计处理 ${toProcess.length} 个记录`);
    console.log('\n运行 `npx tsx scripts/fix/05_refetch_github_readme.ts` (不带 --dry-run) 执行实际更新');
  } else {
    console.log(`\n✅ 完成: 更新 ${updated} 个, 跳过 ${skipped} 个`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
