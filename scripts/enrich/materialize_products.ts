/**
 * 作品/成果实体回填：把散落在 People.products JSON 里、跨人重复的"作品"提炼成 Product 实体
 * （表名 Product 是内部叫法；用户可见一律「作品/成果」，模型永不标成"产品"）。
 *
 * 两条关键规则（产品负责人拍板）：
 *  1. 模型收敛到系列：GPT-1/2/3/4/4o/5 → 一个「GPT」；Claude 各版本 → 「Claude」；o1/o3 → 「o 系列」。
 *     避免 Altman 页面被 GPT-1..5 刷屏。type=model。
 *  2. CEO/founder 不进作品贡献者主区：roleCategory==='founder' 的人不建 ProductContributor，
 *     他们与产物的关系走「公司」那条边，避免"Altman 做了 GPT"的误读。
 *
 * 其它：
 *  - 非系列作品按名归一去重（小写后只留字母数字）；同名不同 org 进 review 清单不硬并。
 *  - 字段合并取最完整；org 匹配 Organization → organizationId。
 *  - 幂等：Product 按 slug upsert；ProductContributor 按 (productId, personId) upsert。
 *  - People.products JSON 保留不动，作回填源 + 回退。
 *
 * 用法:
 *   npx tsx scripts/enrich/materialize_products.ts            # dry-run，只出统计 + review 清单
 *   npx tsx scripts/enrich/materialize_products.ts --execute  # 实际写入
 */

import 'dotenv/config';
import { prisma } from '../../lib/db/prisma';
import { normalizeDirectoryTopics } from '../../lib/person-directory-config';

const EXECUTE = process.argv.includes('--execute');

interface RawProduct {
  name?: string;
  org?: string;
  url?: string;
  type?: string;
  category?: string;
  year?: number;
  description?: string;
  icon?: string;
  topics?: string[];
}

// 模型系列折叠规则：命中则归并为系列名，type=model。注意排除产品壳（如 "Claude Code"）。
const MODEL_SERIES: Array<{ test: (n: string) => boolean; name: string }> = [
  { test: n => /^gpt[-\s]?[\d.]+/i.test(n) || /^gpt$/i.test(n), name: 'GPT' }, // GPT / GPT-3 / GPT-4 / GPT-4o / GPT 4
  { test: n => /^claude(\s+(\d|opus|sonnet|haiku|instant|next))/i.test(n) || /^claude$/i.test(n), name: 'Claude' }, // 排除 "Claude Code"
  { test: n => /^gemini(\s|$|-)/i.test(n) && !/cli/i.test(n), name: 'Gemini' },
  { test: n => /^llama([-\s]|$)/i.test(n), name: 'Llama' }, // "Llama 3"/"Llama-2"/"Llama"，排除 "LlamaIndex"
  { test: n => /^o[1-9]\b/i.test(n), name: 'o 系列' }, // o1 / o3
  { test: n => /^dall[\s·.\-]?e/i.test(n), name: 'DALL·E' },
  { test: n => /^stable\s*diffusion/i.test(n), name: 'Stable Diffusion' },
  { test: n => /^gemma/i.test(n), name: 'Gemma' },
  { test: n => /^mistral/i.test(n) && !/^mistral ai$/i.test(n), name: 'Mistral' },
  { test: n => /^qwen/i.test(n), name: 'Qwen' },
];

interface MergedProduct {
  key: string;
  name: string;
  isSeries: boolean;
  orgs: Set<string>;
  url?: string;
  type: string;
  category?: string;
  firstYear?: number;
  description?: string;
  iconUrl?: string;
  topics: Set<string>;
  contributors: Array<{ personId: string; roleCategory: string | null; personOrgs: string[] }>;
}

function dedupKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9一-龥]/g, '');
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9一-龥]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'work'
  );
}

const TYPE_OVERRIDES: Record<string, string> = {
  chatgpt: 'app',
  copilot: 'app',
  cursor: 'tool',
  perplexityai: 'app',
  midjourney: 'model',
  transformer: 'architecture',
};

function normalizeType(name: string, type?: string, category?: string): string {
  const override = TYPE_OVERRIDES[dedupKey(name)];
  if (override) return override;
  const hay = `${type || ''} ${category || ''}`.toLowerCase();
  if (/(model|llm|gpt|video|diffusion|多模态)/.test(hay)) return 'model';
  if (/(lab|research|研究)/.test(hay)) return 'lab';
  if (/(benchmark|eval|评测|基准)/.test(hay)) return 'benchmark';
  if (/(dataset|数据集)/.test(hay)) return 'dataset';
  if (/(framework|sdk|library|框架)/.test(hay)) return 'framework';
  if (/(architecture|架构|transformer)/.test(hay)) return 'architecture';
  if (/(tool|coding|ide|editor|app|平台|工具|产品|assistant|对话)/.test(hay)) return 'tool';
  return 'other';
}

// 返回该作品的归一身份：系列命中 → 系列名 + model；否则原名 + 关键词推断类型。
function resolveCanonical(name: string, type?: string, category?: string): { key: string; displayName: string; isSeries: boolean; resolvedType: string } {
  for (const s of MODEL_SERIES) {
    if (s.test(name.trim())) {
      return { key: dedupKey(s.name), displayName: s.name, isSeries: true, resolvedType: 'model' };
    }
  }
  return { key: dedupKey(name), displayName: name.trim(), isSeries: false, resolvedType: normalizeType(name, type, category) };
}

async function main() {
  console.log(`🚀 作品/成果实体回填${EXECUTE ? '（执行写入）' : '（dry-run，只报告）'}...\n`);

  const people = await prisma.people.findMany({
    where: { NOT: { products: { equals: null as never } } },
    select: { id: true, name: true, roleCategory: true, organization: true, products: true },
  });

  const orgs = await prisma.organization.findMany({ select: { id: true, name: true, nameZh: true } });
  const orgByName = new Map<string, string>();
  for (const o of orgs) {
    orgByName.set(o.name.toLowerCase(), o.id);
    if (o.nameZh) orgByName.set(o.nameZh.toLowerCase(), o.id);
  }

  const merged = new Map<string, MergedProduct>();
  let rawCount = 0;
  let founderSkips = 0;

  for (const person of people) {
    const list = (Array.isArray(person.products) ? person.products : []) as RawProduct[];
    for (const p of list) {
      const name = (p?.name || '').trim();
      if (!name) continue;
      rawCount++;
      const canon = resolveCanonical(name, p.type, p.category);
      if (!canon.key) continue;
      let m = merged.get(canon.key);
      if (!m) {
        m = {
          key: canon.key,
          name: canon.displayName,
          isSeries: canon.isSeries,
          orgs: new Set(),
          type: canon.resolvedType,
          category: p.category,
          contributors: [],
          topics: new Set(),
        };
        merged.set(canon.key, m);
      }
      if (p.org) m.orgs.add(p.org.trim());
      if (p.url && !m.url) m.url = p.url;
      if (p.icon && !m.iconUrl) m.iconUrl = p.icon;
      // year 可能是字符串区间（如 "2018-2025"），强制取首个 4 位年份为整数
      const yr = Number.parseInt(String(p.year ?? ''), 10);
      if (Number.isFinite(yr) && yr > 1900 && yr < 2100 && (!m.firstYear || yr < m.firstYear)) m.firstYear = yr;
      if (p.description && (!m.description || p.description.length > m.description.length)) m.description = p.description;
      for (const t of normalizeDirectoryTopics(p.topics || [])) m.topics.add(t);

      // CEO/founder 不进作品贡献者主区（走公司边）
      if (person.roleCategory === 'founder') {
        founderSkips++;
        continue;
      }
      if (!m.contributors.some(c => c.personId === person.id)) {
        m.contributors.push({ personId: person.id, roleCategory: person.roleCategory, personOrgs: person.organization || [] });
      }
    }
  }

  const products = [...merged.values()];
  const reviewList = products.filter(p => !p.isSeries && p.orgs.size > 1);
  const byContrib = [...products].sort((a, b) => b.contributors.length - a.contributors.length);

  console.log(`📊 原始 products 条目 ${rawCount} → 去重/收敛后 ${products.length} 个作品（其中模型系列 ${products.filter(p => p.isSeries).length} 个）`);
  console.log(`   founder/CEO 贡献者跳过 ${founderSkips} 次（关系走公司边）\n`);
  console.log(`   贡献者最多的作品（Top 14）：`);
  for (const p of byContrib.slice(0, 14)) {
    console.log(`     ${p.name}  [${p.type}${p.isSeries ? '·系列' : ''}]  贡献者 ${p.contributors.length}  org=${[...p.orgs].join('/') || '—'}`);
  }
  if (reviewList.length) {
    console.log(`\n⚠️ review 清单：${reviewList.length} 个作品同名但 org 不一致（人工确认是否同物）：`);
    for (const p of reviewList.slice(0, 20)) {
      console.log(`     ${p.name} → orgs: ${[...p.orgs].join(' | ')}`);
    }
  }

  if (!EXECUTE) {
    console.log('\nℹ️ dry-run 结束，未写库。确认无误后加 --execute 写入。');
    return;
  }

  let upsertedP = 0;
  let failedP = 0;
  let linkedC = 0;

  for (const p of products) {
    const primaryOrg = [...p.orgs][0];
    const organizationId = primaryOrg ? orgByName.get(primaryOrg.toLowerCase()) || null : null;
    const slug = slugify(p.name);
    const data = {
      name: p.name,
      type: p.type,
      category: p.category || null,
      url: p.url || null,
      iconUrl: p.iconUrl || null,
      firstYear: p.firstYear || null,
      organizationId,
      organizationName: primaryOrg || null,
      topics: [...p.topics],
      description: p.description || null,
      priorityScore: p.contributors.length,
    };
    let product;
    try {
      product = await prisma.product.upsert({ where: { slug }, create: { slug, ...data }, update: data });
      upsertedP++;
    } catch (error) {
      failedP++;
      console.error(`  ❌ 产品写入失败 slug=${slug} name="${p.name}": ${error instanceof Error ? error.message : error}`);
      continue;
    }

    for (const c of p.contributors) {
      const isCreator = ['researcher', 'engineer'].includes(c.roleCategory || '');
      try {
        await prisma.productContributor.upsert({
          where: { productId_personId: { productId: product.id, personId: c.personId } },
          create: { productId: product.id, personId: c.personId, role: isCreator ? 'creator' : 'contributor' },
          update: { role: isCreator ? 'creator' : 'contributor' },
        });
        linkedC++;
      } catch (error) {
        console.error(`  贡献者链接失败 ${product.slug}/${c.personId}: ${error}`);
      }
    }
  }

  console.log(`\n✅ 写入完成：作品 upsert ${upsertedP} / 失败 ${failedP}，贡献者链接 ${linkedC}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
