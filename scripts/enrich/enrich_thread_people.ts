/**
 * 主题关键人物富集脚本（聚焦版，只处理新入库的 3 位 pending 人物）
 *
 * 为什么单独写：通用 enrich_topics_highlights 会扫全部不完整人物，全量跑会对一堆人
 * 花 DeepSeek token。本脚本按名单 + status=pending 精确锁定目标，控制成本。
 *
 * 富集内容：
 *  - 头像：unavatar.io（免费，无 key）从 Twitter/GitHub 取，下载到 public/avatars/
 *  - bio 上下文：Tavily 搜索（Exa 本月额度用完，改用 Tavily）
 *  - description / currentTitle / topics / highlights / roleCategory：DeepSeek 合成
 * 完成后 status 置 'ready'（目录可见），completeness 置 60。
 *
 * 用法: npx tsx scripts/enrich/enrich_thread_people.ts
 */

import { config as loadEnv } from 'dotenv';
// TAVILY_API_KEYS 在 .env.local，dotenv/config 默认只读 .env，故两者都显式加载
loadEnv({ path: '.env' });
loadEnv({ path: '.env.local' });
import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { prisma } from '../../lib/db/prisma';
import { searchTavily } from '../../lib/tavily-search';
import { chatStructuredCompletion, type ChatMessage } from '../../lib/ai/deepseek';
import { DIRECTORY_TOPICS, normalizeDirectoryTopic } from '../../lib/person-directory-config';

const TARGET_NAMES = ['Geoffrey Litt', 'Haijun Xia', 'Yaniv Leviathan', 'Guillermo Rauch'];
const ROLE_CATEGORIES = ['researcher', 'founder', 'engineer', 'professor', 'evangelist'];

interface OfficialLink {
  type?: string;
  platform?: string;
  url?: string;
  handle?: string;
}

function getHandle(links: OfficialLink[], type: string): string | null {
  const hit = links.find(l => l.type === type || l.platform === type);
  return hit?.handle || null;
}

/** 用 unavatar.io 拉头像并落到 public/avatars/，返回 web 路径或 null（免费，无 key）。 */
async function fetchAvatar(personId: string, xHandle: string | null, githubHandle: string | null): Promise<string | null> {
  const candidates: string[] = [];
  if (xHandle) candidates.push(`https://unavatar.io/twitter/${xHandle}?fallback=false`);
  if (githubHandle) candidates.push(`https://unavatar.io/github/${githubHandle}?fallback=false`);

  for (const url of candidates) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024) continue; // 太小多半是占位图
      const filename = `${personId}.jpg`;
      await writeFile(path.join(process.cwd(), 'public', 'avatars', filename), buf);
      console.log(`     头像 ✓ ${url.split('//')[1].split('/')[1]}`);
      return `/avatars/${filename}`;
    } catch {
      // 试下一个源
    }
  }
  return null;
}

interface Synthesized {
  description: string;
  currentTitle: string;
  topics: string[];
  highlights: Array<{ icon: string; text: string }>;
  roleCategory: string;
}

async function synthesize(person: {
  name: string;
  whyImportant: string | null;
  occupation: string[];
  organization: string[];
}, context: string): Promise<Synthesized | null> {
  const systemPrompt = `你是 AI 领域专家，为 AI 人物库生成结构化档案。只依据给定信息，避免编造；信息不足的字段给保守值。`;
  const userPrompt = `人物：${person.name}
职业：${person.occupation.join(', ') || '无'}
机构：${person.organization.join(', ') || '无'}
已知贡献：${person.whyImportant || '无'}

网络检索摘要（可能含噪声，谨慎采信）：
${context || '无'}

请返回 JSON：
{
  "description": "一句话中文简介，<=60字，客观",
  "currentTitle": "当前职位，英文，形如 'Engineering Lead @ Google Chrome'，不确定就给最稳妥的",
  "topics": ["从下列里挑2-4个最相关：${DIRECTORY_TOPICS.join('、')}"],
  "highlights": [{"icon":"💻","text":"具体成就1"},{"icon":"🔥","text":"具体成就2"}],
  "roleCategory": "从 ${ROLE_CATEGORIES.join('/')} 选一个"
}`;
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];
  try {
    const r = await chatStructuredCompletion<Synthesized>(messages, { temperature: 0.3, maxTokens: 1200 });
    const topics = (r.topics || [])
      .map(t => normalizeDirectoryTopic(t))
      .filter(t => DIRECTORY_TOPICS.includes(t));
    return {
      description: (r.description || '').trim(),
      currentTitle: (r.currentTitle || '').trim(),
      topics: [...new Set(topics)].slice(0, 4),
      highlights: (r.highlights || []).slice(0, 2),
      roleCategory: ROLE_CATEGORIES.includes(r.roleCategory) ? r.roleCategory : 'evangelist',
    };
  } catch (error) {
    console.error(`     DeepSeek 合成失败: ${error}`);
    return null;
  }
}

async function main() {
  console.log('🚀 富集主题关键人物（Tavily + DeepSeek + unavatar）...\n');
  const people = await prisma.people.findMany({
    where: { name: { in: TARGET_NAMES } },
    select: { id: true, name: true, whyImportant: true, occupation: true, organization: true, officialLinks: true },
  });
  console.log(`📋 命中 ${people.length} 人\n`);

  let done = 0;
  for (const person of people) {
    console.log(`处理: ${person.name}`);
    const links = (Array.isArray(person.officialLinks) ? person.officialLinks : []) as OfficialLink[];
    const xHandle = getHandle(links, 'twitter');
    const githubHandle = getHandle(links, 'github');

    // 1. 头像（免费）
    const avatarUrl = await fetchAvatar(person.id, xHandle, githubHandle);

    // 2. Tavily 取 bio 上下文
    let context = '';
    try {
      const q = `${person.name} ${person.organization.join(' ')} AI engineer`;
      const results = await searchTavily(q, { maxResults: 5 });
      context = results.map(r => `- ${r.title}: ${r.text}`).join('\n').slice(0, 4000);
      console.log(`     Tavily ✓ ${results.length} 条`);
    } catch (error) {
      console.error(`     Tavily 失败: ${error}`);
    }

    // 3. DeepSeek 合成
    const syn = await synthesize(person, context);

    // 4. 写回
    const data: Record<string, unknown> = { status: 'ready', completeness: 60 };
    if (avatarUrl) data.avatarUrl = avatarUrl;
    if (syn) {
      if (syn.description) data.description = syn.description;
      if (syn.currentTitle) data.currentTitle = syn.currentTitle;
      if (syn.topics.length) data.topics = syn.topics;
      if (syn.highlights.length) data.highlights = syn.highlights;
      data.roleCategory = syn.roleCategory;
    }
    await prisma.people.update({ where: { id: person.id }, data });
    console.log(`  ✅ ${person.name}: ${syn ? `topics=[${syn.topics.join(',')}] role=${syn.roleCategory}` : '仅头像/状态'}${avatarUrl ? ' +头像' : ''}\n`);
    done++;
    await new Promise(r => setTimeout(r, 600));
  }

  console.log('='.repeat(50));
  console.log(`📊 完成 ${done}/${people.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
