import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getWikidataEntity, getWikidataEntityWithTranslation } from '@/lib/datasources/wikidata';
import { inngest } from '@/lib/inngest/client';
import { downloadAndStoreAvatar } from '@/lib/storage/avatarStorage';
import { registerPipeline } from './registry';
import type { MaintenancePipeline, PipelineContext, PipelineValidateInput } from './types';

export type MaintenanceKind = 'new_person_build' | 'single_person_refresh' | 'multi_person_refresh' | 'all_people_refresh';
export type MaintenanceRefreshMode = 'incremental' | 'force' | 'rebuild';
export type MaintenanceSourceType = 'exa' | 'grok' | 'youtube' | 'openalex' | 'podcast' | 'github' | 'career';

export const MAINTENANCE_KIND_LABELS: Record<MaintenanceKind, string> = {
  new_person_build: '新人物首次构建',
  single_person_refresh: '单人物更新',
  multi_person_refresh: '多人物列表更新',
  all_people_refresh: '全站批量更新',
};

export const MAINTENANCE_SOURCE_TYPES = ['exa', 'grok', 'youtube', 'openalex', 'podcast', 'github', 'career'] as const;

type MaintenancePerson = {
  id: string;
  name: string;
  qid: string;
  aliases: string[];
  organization: string[];
  officialLinks: Prisma.JsonValue;
  orcid?: string;
};

// —— 任务主体（从 lib/admin/maintenance.ts 搬迁，进度/日志/取消改走 ctx，终态归外壳）——

/** single/multi/all 三种刷新共用主体。 */
async function runRefresh(ctx: PipelineContext, kind: MaintenanceKind): Promise<void> {
  const people = await resolveTargets(kind, ctx.targetPersonIds, ctx.options);
  const refreshMode = getRefreshMode(ctx.options);
  const sourceTypes = getSourceTypes(ctx.options);

  await ctx.setTotal(people.length);
  if (people.length === 0) {
    await ctx.log('warning', '没有匹配到需要更新的人物');
  }

  for (const [index, person] of people.entries()) {
    if (await ctx.isCancelled()) return;

    if (ctx.dryRun) {
      await ctx.log('info', `dry-run: 将${refreshMode === 'rebuild' ? '重建' : '刷新'} ${person.name}`, {
        personId: person.id,
        refreshMode,
        sourceTypes,
      });
    } else {
      const preparedPerson = refreshMode === 'rebuild' ? await preparePersonForRebuild(person) : person;
      const triggerMetadata = await triggerPersonUpdate(preparedPerson, ctx.options);
      await ctx.log('info', `已投递 ${preparedPerson.name} 的构建任务`, {
        personId: preparedPerson.id,
        ...triggerMetadata,
      });
    }

    await ctx.setDone(index + 1);
  }

  if (await ctx.isCancelled()) return;
  await ctx.log('info', ctx.dryRun ? `dry-run 完成，共检查 ${people.length} 人` : `任务投递完成，共投递 ${people.length} 人`);
}

async function runNewPersonBuild(ctx: PipelineContext): Promise<void> {
  const qids = getTargetQids(ctx.options);
  const sourceTypes = getSourceTypes(ctx.options);
  const refreshMode = getRefreshMode(ctx.options);

  await ctx.setTotal(qids.length);
  if (qids.length === 0) {
    await ctx.log('warning', '没有填写需要构建的新人物 QID');
  }

  for (const [index, qid] of qids.entries()) {
    if (await ctx.isCancelled()) return;

    const existing = await prisma.people.findUnique({ where: { qid }, select: personSelect() });

    if (ctx.dryRun) {
      await ctx.log('info', existing ? `dry-run: ${qid} 已存在，将触发 ${existing.name}` : `dry-run: 将创建并构建 ${qid}`, {
        qid,
        personId: existing?.id,
        sourceTypes,
      });
    } else {
      const { person, created } = existing
        ? { person: refreshMode === 'rebuild' ? await preparePersonForRebuild(existing) : existing, created: false }
        : { person: await createPersonFromQid(qid), created: true };

      const triggerMetadata = await triggerPersonUpdate(person, ctx.options);
      await ctx.log('info', `${created ? '已创建并投递' : '已存在并投递'} ${person.name}`, {
        qid,
        personId: person.id,
        ...triggerMetadata,
      });
    }

    await ctx.setDone(index + 1);
  }

  if (await ctx.isCancelled()) return;
  await ctx.log('info', ctx.dryRun ? `dry-run 完成，共检查 ${qids.length} 个 QID` : `任务投递完成，共投递 ${qids.length} 个 QID`);
}

// —— 注册 ——

function validatePerson(kind: MaintenanceKind) {
  return (input: PipelineValidateInput): string | null => {
    const refreshMode = getRefreshMode(input.options);
    const sourceTypes = getSourceTypes(input.options);
    if (kind === 'new_person_build' && getTargetQids(input.options).length === 0) return '请填写至少一个 Wikidata QID';
    if (kind === 'single_person_refresh' && input.targetPersonIds.length === 0) return '请选择一个人物';
    if (kind === 'multi_person_refresh' && input.targetPersonIds.length === 0) return '请填写至少一个人物 ID';
    if (refreshMode === 'rebuild' && sourceTypes.length > 0) return '清空重建模式不支持单独选择媒体渠道，请使用全部来源';
    return null;
  };
}

function personPipeline(kind: MaintenanceKind, run: (ctx: PipelineContext) => Promise<void>): MaintenancePipeline {
  return { kind, label: MAINTENANCE_KIND_LABELS[kind], category: 'person', validate: validatePerson(kind), run };
}

registerPipeline(personPipeline('new_person_build', runNewPersonBuild));
registerPipeline(personPipeline('single_person_refresh', ctx => runRefresh(ctx, 'single_person_refresh')));
registerPipeline(personPipeline('multi_person_refresh', ctx => runRefresh(ctx, 'multi_person_refresh')));
registerPipeline(personPipeline('all_people_refresh', ctx => runRefresh(ctx, 'all_people_refresh')));

// —— 数据解析 / 人物处理（从 maintenance.ts 原样搬迁）——

async function resolveTargets(kind: MaintenanceKind, targetPersonIds: string[], options: unknown): Promise<MaintenancePerson[]> {
  const limit = clampInteger(getOption(options, 'limit'), 1, 5000, 5000);
  const status = getStringOption(options, 'status');
  const search = getStringOption(options, 'search');

  if (kind === 'single_person_refresh' || kind === 'multi_person_refresh') {
    const ids = uniqueStrings(targetPersonIds).slice(0, kind === 'single_person_refresh' ? 1 : 200);
    if (ids.length === 0) return [];
    const people = await prisma.people.findMany({
      where: { id: { in: ids } },
      select: personSelect(),
    });
    const byId = new Map(people.map(person => [person.id, person]));
    return ids.map(id => byId.get(id)).filter((person): person is MaintenancePerson => Boolean(person));
  }

  return prisma.people.findMany({
    where: {
      ...(status && status !== 'all' ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { aliases: { has: search } },
            ],
          }
        : {}),
    },
    select: personSelect(),
    orderBy: [{ updatedAt: 'asc' }, { name: 'asc' }],
    take: limit,
  });
}

async function createPersonFromQid(qid: string): Promise<MaintenancePerson> {
  const entity = await getWikidataEntityWithTranslation(qid);
  if (!entity) throw new Error(`无法获取 Wikidata 实体：${qid}`);

  let localAvatarUrl: string | null = null;
  if (entity.imageUrl) {
    localAvatarUrl = await downloadAndStoreAvatar(entity.imageUrl, qid);
  }

  const person = await prisma.people.create({
    data: {
      qid: entity.qid,
      name: entity.label,
      aliases: entity.aliases,
      description: entity.description,
      avatarUrl: localAvatarUrl,
      occupation: entity.occupation || [],
      organization: entity.organization || [],
      officialLinks: entity.officialLinks,
      sourceWhitelist: extractWhitelistDomains(entity.officialLinks),
      status: 'pending',
      completeness: 0,
    },
    select: personSelect(),
  });

  return { ...person, orcid: entity.orcid };
}

async function preparePersonForRebuild(person: MaintenancePerson): Promise<MaintenancePerson> {
  const entity = await getWikidataEntityWithTranslation(person.qid);
  if (!entity) throw new Error(`无法刷新 Wikidata 实体：${person.qid}`);

  await prisma.people.update({
    where: { id: person.id },
    data: {
      name: entity.label,
      description: entity.description,
      aliases: entity.aliases,
      occupation: entity.occupation || [],
      organization: entity.organization || [],
      officialLinks: entity.officialLinks,
      avatarUrl: entity.imageUrl || undefined,
      status: 'building',
      completeness: 0,
      lastFetchedAt: {},
    },
  });

  await prisma.rawPoolItem.deleteMany({ where: { personId: person.id } });
  await prisma.card.updateMany({
    where: { personId: person.id, isActive: true },
    data: { isActive: false, archivedAt: new Date() },
  });

  const refreshed = await prisma.people.findUnique({
    where: { id: person.id },
    select: personSelect(),
  });
  if (!refreshed) throw new Error(`人物不存在：${person.id}`);
  return { ...refreshed, orcid: entity.orcid };
}

async function triggerPersonUpdate(person: MaintenancePerson, options: unknown) {
  const sourceTypes = getSourceTypes(options);
  const refreshMode = getRefreshMode(options);
  const needsOpenAlexIdentity = sourceTypes.length === 0 || sourceTypes.includes('openalex');
  const wikidataEntity = needsOpenAlexIdentity ? await getWikidataEntity(person.qid) : null;
  const officialLinks = normalizeOfficialLinks(person.officialLinks);
  const eventOfficialLinks = officialLinks.length > 0 ? officialLinks : wikidataEntity?.officialLinks || [];
  const aliases = uniqueStrings([...person.aliases, ...(wikidataEntity?.aliases || [])]);
  const englishName = aliases.find(alias => /^[a-zA-Z\s]+$/.test(alias)) || wikidataEntity?.englishLabel;
  const orcid = person.orcid || wikidataEntity?.orcid;

  await inngest.send({
    name: 'person/created',
    data: {
      personId: person.id,
      personName: person.name,
      englishName,
      qid: person.qid,
      aliases,
      organization: person.organization,
      officialLinks: eventOfficialLinks,
      orcid,
      forceRefresh: refreshMode === 'force' || refreshMode === 'rebuild',
      sourceTypes: sourceTypes.length > 0 ? sourceTypes : undefined,
    },
  });

  return {
    refreshMode,
    sourceTypes,
    orcid: orcid || null,
    officialLinkCount: eventOfficialLinks.length,
  };
}

function personSelect() {
  return {
    id: true,
    name: true,
    qid: true,
    aliases: true,
    organization: true,
    officialLinks: true,
  } satisfies Prisma.PeopleSelect;
}

// —— option / 工具助手（从 maintenance.ts 搬迁，参数放宽到 unknown 以接 ctx.options）——

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getOption(value: unknown, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

function getStringOption(value: unknown, key: string): string {
  const option = getOption(value, key);
  return typeof option === 'string' ? option.trim() : '';
}

function getRefreshMode(options: unknown): MaintenanceRefreshMode {
  const value = isRecord(options) ? options.refreshMode : undefined;
  if (value === 'force' || value === 'rebuild') return value;
  return 'incremental';
}

function getSourceTypes(options: unknown): MaintenanceSourceType[] {
  const value = isRecord(options) ? options.sourceTypes : undefined;
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .map(item => typeof item === 'string' ? normalizeSourceType(item) : null)
    .filter((item): item is MaintenanceSourceType => Boolean(item)))];
}

function normalizeSourceType(value: string): MaintenanceSourceType | null {
  if (value === 'x') return 'grok';
  return MAINTENANCE_SOURCE_TYPES.includes(value as MaintenanceSourceType) ? value as MaintenanceSourceType : null;
}

function normalizeOfficialLinks(value: Prisma.JsonValue): Array<{ type: string; url: string; handle?: string }> {
  if (!Array.isArray(value)) return [];
  const links: Array<{ type: string; url: string; handle?: string }> = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    const type = typeof item.type === 'string' ? item.type : '';
    const url = typeof item.url === 'string' ? item.url : '';
    const handle = typeof item.handle === 'string' ? item.handle : undefined;
    if (!type || !url) continue;
    const link: { type: string; url: string; handle?: string } = { type, url };
    if (handle) link.handle = handle;
    links.push(link);
  }
  return links;
}

function getTargetQids(options: unknown): string[] {
  const value = isRecord(options) ? options.targetQids : undefined;
  if (Array.isArray(value)) return uniqueStrings(value.filter((item): item is string => typeof item === 'string'));
  if (typeof value === 'string') return uniqueStrings(value.split(/[\s,]+/));
  return [];
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map(value => value.trim()).filter(Boolean))];
}

function extractWhitelistDomains(links: { url: string }[]): string[] {
  const domains: string[] = [];
  for (const link of links) {
    try {
      domains.push(new URL(link.url).hostname);
    } catch {
      // Ignore malformed official link URLs from source data.
    }
  }
  return uniqueStrings(domains);
}
