import { prisma } from '@/lib/db/prisma';
import {
  COMPANY_PRESENTATION_KEYS,
  getCompanyPresentationByKey,
  resolveCompanyPresentationKey,
} from '@/lib/entity-presentations/company-presentation';
import { buildOrganizationHref } from '@/lib/person-directory-config';

/**
 * 规范展示名覆盖：自动取「人物最多的 org 行」时，某些公司会选到子机构名
 * （Meta→「Facebook AI Research (FAIR)」、Apple→「Apple Inc.」、阿里→「Alibaba DAMO Academy」），
 * 这里把品牌名钉死。这些名字都能经 companyKey/alias 往返解析到对应策展页。
 */
const DISPLAY_NAME_OVERRIDES: Record<string, string> = {
  meta: 'Meta',
  apple: 'Apple',
  'alibaba-damo-academy': '阿里巴巴',
};

/**
 * 已下载本地高清 logo 的公司 key（/public/logos/{key}.png，来源 GitHub 组织头像）。
 * 维护脚本：scripts/fix/download_company_logos.sh。
 */
const LOCAL_LOGO_KEYS = new Set([
  'anthropic', 'openai', 'xai', 'alibaba-damo-academy', 'apple', 'cloudflare',
  'deepseek', 'google', 'hugging-face', 'minimax', 'mistral-ai', 'nvidia',
  'meta', 'microsoft', 'cohere', 'perplexity', 'anysphere', 'thinking-machines-lab',
  'amazon', 'moonshot-ai', 'baidu', 'zhipu-ai', 'tencent', 'bytedance',
]);

function hostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * 公司 logo：本地高清优先（GitHub 组织头像，已落 /public/logos）；
 * 没有本地图的（未来新增公司）才按官网域名回退 Google favicon。
 */
function buildLogoUrl(key: string, homepageUrl?: string): string | null {
  if (LOCAL_LOGO_KEYS.has(key)) return `/logos/${key}.png`;
  const host = homepageUrl ? hostname(homepageUrl) : null;
  return host ? `https://www.google.com/s2/favicons?sz=128&domain=${host}` : null;
}

export interface CompanyDirectoryEntry {
  /** 策展页规范 key（唯一）。 */
  key: string;
  /** 用于展示与构造 /org/[name] 链接的公司名（取人物最多的 org 行）。 */
  displayName: string;
  href: string;
  heroDescription: string;
  productCount: number;
  learningCount: number;
  /** 去重后的关键人物数（跨同一策展页下的多条 org 行聚合）。 */
  peopleCount: number;
  logoUrl: string | null;
}

/**
 * 公司目录数据源。只上架「有策展页（COMPANY_PRESENTATIONS）」的公司，
 * 库里 500+ 条裸 org 记录（仅作人物任职附属）不进目录。
 *
 * 取数策略：把所有 org 行按 resolveCompanyPresentationKey 归组到策展 key，
 * 同一公司的多条 org 行（如 Facebook / Meta AI / FAIR → meta）合并，
 * 展示名取该组里人物最多的 org 行，人物数按 personId 去重聚合。
 */
export async function fetchCompanyDirectory(): Promise<CompanyDirectoryEntry[]> {
  const orgs = await prisma.organization.findMany({
    select: {
      id: true,
      name: true,
      nameZh: true,
      roles: { select: { personId: true } },
    },
  });

  // key → { orgId → {name, personIds} }
  const grouped = new Map<
    string,
    { name: string; peopleForName: number; personIds: Set<string> }
  >();

  for (const org of orgs) {
    const key =
      resolveCompanyPresentationKey(org.nameZh ?? '') ??
      resolveCompanyPresentationKey(org.name);
    if (!key) continue;

    const personIds = new Set(org.roles.map(r => r.personId));
    const existing = grouped.get(key);
    if (!existing) {
      grouped.set(key, {
        name: org.name,
        peopleForName: personIds.size,
        personIds: new Set(personIds),
      });
      continue;
    }
    // 累加去重人物
    for (const id of personIds) existing.personIds.add(id);
    // 展示名取「单条 org 行人物最多」的那条，避免选到边角子机构名
    if (personIds.size > existing.peopleForName) {
      existing.name = org.name;
      existing.peopleForName = personIds.size;
    }
  }

  const entries: CompanyDirectoryEntry[] = [];
  for (const key of COMPANY_PRESENTATION_KEYS) {
    const seed = getCompanyPresentationByKey(key);
    if (!seed) continue;
    const group = grouped.get(key);
    // 优先规范覆盖名；否则取「人物最多的 org 行」名；都没有则用 key 兜底
    const displayName = DISPLAY_NAME_OVERRIDES[key] ?? group?.name ?? key;
    entries.push({
      key,
      displayName,
      href: buildOrganizationHref(displayName),
      heroDescription: seed.heroDescription,
      productCount: seed.products.length,
      learningCount: seed.learningResources.length,
      peopleCount: group?.personIds.size ?? 0,
      logoUrl: buildLogoUrl(key, seed.homepageUrl),
    });
  }

  // 排序：先按关键人物数（公司相关性 proxy），再按产品线丰富度
  entries.sort(
    (a, b) => b.peopleCount - a.peopleCount || b.productCount - a.productCount
  );
  return entries;
}
