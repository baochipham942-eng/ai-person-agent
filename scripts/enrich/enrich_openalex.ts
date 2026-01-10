/**
 * 从 OpenAlex API 获取学术指标 (引用数、h-index)
 * OpenAlex 是免费的学术数据 API，无需 API key
 *
 * 用法: bun scripts/enrich/enrich_openalex.ts [--limit N] [--force]
 */

import { prisma } from '../../lib/db/prisma';

const OPENALEX_BASE = 'https://api.openalex.org';

// 礼貌请求头，OpenAlex 推荐添加邮箱以获得更好的速率限制
const HEADERS = {
  'User-Agent': 'AI-Person-Agent/1.0 (mailto:contact@example.com)',
  'Accept': 'application/json'
};

interface OpenAlexAuthor {
  id: string;
  display_name: string;
  works_count: number;
  cited_by_count: number;
  summary_stats: {
    h_index: number;
    i10_index: number;
    '2yr_mean_citedness': number;
  };
  affiliations?: Array<{
    institution: {
      display_name: string;
    };
  }>;
}

interface OpenAlexSearchResult {
  meta: { count: number };
  results: OpenAlexAuthor[];
}

/**
 * 搜索 OpenAlex 作者
 */
async function searchOpenAlexAuthor(
  name: string,
  affiliations?: string[]
): Promise<OpenAlexAuthor | null> {
  try {
    // 构建搜索查询 - 只使用名字搜索，不添加机构过滤（容易导致 400 错误）
    const searchQuery = encodeURIComponent(name);
    const url = `${OPENALEX_BASE}/authors?search=${searchQuery}&per_page=5`;

    const response = await fetch(url, { headers: HEADERS });

    if (!response.ok) {
      throw new Error(`OpenAlex API error: ${response.status}`);
    }

    const data: OpenAlexSearchResult = await response.json();

    if (data.results.length === 0) {
      return null;
    }

    // 如果只有一个结果，直接返回
    if (data.results.length === 1) {
      return data.results[0];
    }

    // 多个结果时，优先选择机构匹配的，否则选引用数最高的
    if (affiliations && affiliations.length > 0) {
      for (const author of data.results) {
        if (author.affiliations) {
          const authorInstitutions = author.affiliations
            .map(a => a.institution.display_name.toLowerCase());

          const hasMatch = affiliations.some(org =>
            authorInstitutions.some(inst =>
              inst.includes(org.toLowerCase()) || org.toLowerCase().includes(inst)
            )
          );

          if (hasMatch) {
            return author;
          }
        }
      }
    }

    // 没有机构匹配，选择引用数最高的
    return data.results.reduce((best, current) =>
      current.cited_by_count > best.cited_by_count ? current : best
    );

  } catch (error) {
    console.error(`  ⚠️ OpenAlex 搜索失败: ${error}`);
    return null;
  }
}

/**
 * 根据 OpenAlex ID 获取详细信息
 */
async function getOpenAlexAuthorById(openalexId: string): Promise<OpenAlexAuthor | null> {
  try {
    const response = await fetch(`${OPENALEX_BASE}/authors/${openalexId}`, {
      headers: HEADERS
    });

    if (!response.ok) {
      throw new Error(`OpenAlex API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`  ⚠️ OpenAlex 获取失败: ${error}`);
    return null;
  }
}

/**
 * 验证作者匹配度
 * 通过比较机构、研究领域等来判断是否是同一个人
 */
function isLikelyMatch(
  author: OpenAlexAuthor,
  person: { name: string; organization: string[] }
): boolean {
  // 基本检查：名字相似度
  const authorNameLower = author.display_name.toLowerCase();
  const personNameLower = person.name.toLowerCase();

  // 检查名字是否匹配（允许部分匹配）
  const nameMatch = authorNameLower.includes(personNameLower) ||
    personNameLower.includes(authorNameLower) ||
    authorNameLower.split(' ').some(part => personNameLower.includes(part));

  if (!nameMatch) {
    return false;
  }

  // 检查机构匹配
  if (author.affiliations && person.organization.length > 0) {
    const authorInstitutions = author.affiliations
      .map(a => a.institution.display_name.toLowerCase());

    const hasOrgMatch = person.organization.some(org =>
      authorInstitutions.some(inst =>
        inst.includes(org.toLowerCase()) || org.toLowerCase().includes(inst)
      )
    );

    if (hasOrgMatch) {
      return true;
    }
  }

  // 如果引用数很高，倾向于认为是匹配的（知名学者）
  if (author.cited_by_count > 1000) {
    return true;
  }

  return nameMatch;
}

/**
 * 主函数
 */
async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(a => a.startsWith('--limit='));
  const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;
  const force = args.includes('--force');

  console.log('🎓 开始从 OpenAlex 获取学术数据...\n');

  // 获取需要处理的人物
  const whereClause = force
    ? {}
    : {
        OR: [
          { openalexId: null },
          { citationCount: 0 },
          { hIndex: 0 }
        ]
      };

  const people = await prisma.people.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      aliases: true,
      organization: true,
      openalexId: true,
      occupation: true,
    },
    take: limit,
    orderBy: { aiContributionScore: 'desc' }
  });

  console.log(`📋 找到 ${people.length} 个人物需要处理\n`);

  let successCount = 0;
  let notFoundCount = 0;
  let errorCount = 0;

  for (let i = 0; i < people.length; i++) {
    const person = people[i];
    console.log(`[${i + 1}/${people.length}] 处理: ${person.name}`);

    try {
      let author: OpenAlexAuthor | null = null;

      // 如果已有 OpenAlex ID，直接获取
      if (person.openalexId) {
        author = await getOpenAlexAuthorById(person.openalexId);
      } else {
        // 搜索作者
        author = await searchOpenAlexAuthor(person.name, person.organization);

        // 尝试用别名搜索
        if (!author && person.aliases.length > 0) {
          for (const alias of person.aliases.slice(0, 2)) {
            author = await searchOpenAlexAuthor(alias, person.organization);
            if (author) break;
          }
        }
      }

      if (!author) {
        console.log(`  ⚠️ 未找到 OpenAlex 记录`);
        notFoundCount++;
        continue;
      }

      // 验证匹配度
      if (!isLikelyMatch(author, person)) {
        console.log(`  ⚠️ 匹配度不足，跳过: ${author.display_name}`);
        notFoundCount++;
        continue;
      }

      // 提取 OpenAlex ID (去掉 URL 前缀)
      const openalexId = author.id.replace('https://openalex.org/', '');

      // 更新数据库
      await prisma.people.update({
        where: { id: person.id },
        data: {
          openalexId,
          citationCount: author.cited_by_count,
          hIndex: author.summary_stats.h_index
        }
      });

      console.log(`  ✅ 引用: ${author.cited_by_count.toLocaleString()}`);
      console.log(`  ✅ h-index: ${author.summary_stats.h_index}`);
      console.log(`  ✅ OpenAlex ID: ${openalexId}`);
      successCount++;

      // 避免 API 限流 (OpenAlex 限制 10 req/s)
      await new Promise(r => setTimeout(r, 150));

    } catch (error) {
      console.error(`  ❌ 失败: ${error}`);
      errorCount++;
    }
  }

  console.log('\n📊 处理完成');
  console.log(`  ✅ 成功: ${successCount}`);
  console.log(`  ⚠️ 未找到: ${notFoundCount}`);
  console.log(`  ❌ 失败: ${errorCount}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
