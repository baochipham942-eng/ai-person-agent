import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { getWikidataEntity, getWikidataEntityWithTranslation } from '@/lib/datasources/wikidata';
import { inngest } from '@/lib/inngest/client';
import { downloadAndStoreAvatar } from '@/lib/storage/avatarStorage';

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

interface MaintenanceCreateInput {
  kind: MaintenanceKind;
  dryRun: boolean;
  requestedById: string | null;
  targetPersonIds: string[];
  options: Record<string, unknown>;
  triggerSource?: string;
  sourceJobId?: string | null;
  retryCount?: number;
}

type MaintenancePerson = {
  id: string;
  name: string;
  qid: string;
  aliases: string[];
  organization: string[];
  officialLinks: Prisma.JsonValue;
  orcid?: string;
};

export async function createAndQueueMaintenanceJob(input: MaintenanceCreateInput) {
  const job = await prisma.maintenanceJob.create({
    data: {
      kind: input.kind,
      dryRun: input.dryRun,
      triggerSource: input.triggerSource || 'manual',
      requestedById: input.requestedById,
      sourceJobId: input.sourceJobId || null,
      retryCount: input.retryCount || 0,
      targetPersonIds: input.targetPersonIds,
      options: toJsonObject(input.options),
      command: commandForJob(input.kind, input.dryRun, input.options),
    },
    select: {
      id: true,
    },
  });

  await prisma.userAuditLog.create({
    data: {
      actorUserId: input.requestedById,
      action: 'ADMIN_CREATED_MAINTENANCE_JOB',
      metadata: toJsonObject({
        jobId: job.id,
        kind: input.kind,
        dryRun: input.dryRun,
        triggerSource: input.triggerSource || 'manual',
        sourceJobId: input.sourceJobId || null,
        retryCount: input.retryCount || 0,
        targetPersonCount: input.targetPersonIds.length,
        targetQidCount: getTargetQids(input.options).length,
        options: input.options,
      }),
    },
  });

  await appendMaintenanceLog(job.id, 'info', '任务已进入后台队列');
  await enqueueMaintenanceJob(job.id);
  return job.id;
}

async function enqueueMaintenanceJob(jobId: string) {
  try {
    await inngest.send({
      name: 'maintenance/job.requested',
      data: {
        jobId,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.maintenanceJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage: `后台队列投递失败：${message}`,
        completedAt: new Date(),
      },
    });
    await appendMaintenanceLog(jobId, 'error', `后台队列投递失败：${message}`);
    throw error;
  }
}

export async function retryMaintenanceJob(jobId: string, requestedById: string) {
  const source = await prisma.maintenanceJob.findUnique({
    where: { id: jobId },
    select: {
      kind: true,
      dryRun: true,
      targetPersonIds: true,
      options: true,
      retryCount: true,
    },
  });

  if (!source || !isMaintenanceKind(source.kind)) {
    throw new Error('维护任务不存在');
  }

  return createAndQueueMaintenanceJob({
    kind: source.kind,
    dryRun: source.dryRun,
    requestedById,
    targetPersonIds: source.targetPersonIds,
    options: isRecord(source.options) ? source.options : {},
    triggerSource: 'retry',
    sourceJobId: jobId,
    retryCount: source.retryCount + 1,
  });
}

export async function cancelMaintenanceJob(jobId: string, requestedById: string, reason?: string) {
  const job = await prisma.maintenanceJob.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      progressDone: true,
      progressTotal: true,
    },
  });

  if (!job) throw new Error('维护任务不存在');
  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    throw new Error('当前任务状态不能取消');
  }

  const now = new Date();
  const nextStatus = job.status === 'queued' ? 'cancelled' : 'cancelling';
  await prisma.maintenanceJob.update({
    where: { id: jobId },
    data: {
      status: nextStatus,
      cancelRequestedAt: now,
      canceledById: requestedById,
      cancelReason: reason?.trim() || null,
      completedAt: nextStatus === 'cancelled' ? now : undefined,
      errorMessage: nextStatus === 'cancelled' ? null : '管理员已请求取消，任务会在当前人物处理后停止',
    },
  });

  await prisma.userAuditLog.create({
    data: {
      actorUserId: requestedById,
      action: 'ADMIN_CANCELLED_MAINTENANCE_JOB',
      metadata: toJsonObject({
        jobId,
        previousStatus: job.status,
        nextStatus,
        progressDone: job.progressDone,
        progressTotal: job.progressTotal,
        reason: reason?.trim() || null,
      }),
    },
  });

  await appendMaintenanceLog(jobId, 'warning', nextStatus === 'cancelled' ? '任务已取消' : '已请求取消，任务会在当前人物处理后停止', {
    canceledById: requestedById,
    reason: reason?.trim() || null,
  });

  return nextStatus;
}

export async function runMaintenanceJob(jobId: string) {
  const job = await prisma.maintenanceJob.findUnique({
    where: { id: jobId },
  });

  if (!job || !isMaintenanceKind(job.kind)) return;
  if (job.status === 'cancelled' || job.status === 'cancelling') return;

  const started = await prisma.maintenanceJob.updateMany({
    where: {
      id: jobId,
      status: { notIn: ['cancelled', 'cancelling'] },
    },
    data: {
      status: 'running',
      startedAt: new Date(),
      errorMessage: null,
    },
  });
  if (started.count === 0) return;

  await appendMaintenanceLog(jobId, 'info', `开始${MAINTENANCE_KIND_LABELS[job.kind]}${job.dryRun ? ' dry-run' : ''}`);

  try {
    if (job.kind === 'new_person_build') {
      await runNewPersonBuildJob(jobId, job.dryRun, job.options);
      return;
    }

    const people = await resolveTargets(job.kind, job.targetPersonIds, job.options);
    const refreshMode = getRefreshMode(job.options);
    const sourceTypes = getSourceTypes(job.options);

    await prisma.maintenanceJob.update({
      where: { id: jobId },
      data: {
        progressTotal: people.length,
      },
    });

    if (people.length === 0) {
      await appendMaintenanceLog(jobId, 'warning', '没有匹配到需要更新的人物');
    }

    for (const [index, person] of people.entries()) {
      if (await finishIfCancellationRequested(jobId)) return;

      if (job.dryRun) {
        await appendMaintenanceLog(jobId, 'info', `dry-run: 将${refreshMode === 'rebuild' ? '重建' : '刷新'} ${person.name}`, {
          personId: person.id,
          refreshMode,
          sourceTypes,
        });
      } else {
        const preparedPerson = refreshMode === 'rebuild' ? await preparePersonForRebuild(person) : person;
        const triggerMetadata = await triggerPersonUpdate(preparedPerson, job.options);
        await appendMaintenanceLog(jobId, 'info', `已投递 ${preparedPerson.name} 的构建任务`, {
          personId: preparedPerson.id,
          ...triggerMetadata,
        });
      }

      await prisma.maintenanceJob.update({
        where: { id: jobId },
        data: {
          progressDone: index + 1,
        },
      });
    }

    if (await finishIfCancellationRequested(jobId)) return;

    await prisma.maintenanceJob.update({
      where: { id: jobId },
      data: {
        status: 'completed',
        completedAt: new Date(),
      },
    });

    await appendMaintenanceLog(jobId, 'info', job.dryRun ? `dry-run 完成，共检查 ${people.length} 人` : `任务投递完成，共投递 ${people.length} 人`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.maintenanceJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errorMessage: message,
        completedAt: new Date(),
      },
    });
    await appendMaintenanceLog(jobId, 'error', message);
  }
}

export async function runDueMaintenanceSchedules(scanAt = new Date()) {
  const schedules = await prisma.maintenanceSchedule.findMany({
    where: {
      enabled: true,
      OR: [
        { nextRunAt: null },
        { nextRunAt: { lte: scanAt } },
      ],
    },
    orderBy: [{ nextRunAt: 'asc' }, { createdAt: 'asc' }],
    take: 10,
  });

  let queued = 0;
  const skipped: string[] = [];

  for (const schedule of schedules) {
    if (!isMaintenanceKind(schedule.kind)) {
      skipped.push(schedule.id);
      continue;
    }

    const intervalHours = clampInteger(schedule.intervalHours, 1, 24 * 14, 24);
    const nextRunAt = addHours(scanAt, intervalHours);
    const locked = await prisma.maintenanceSchedule.updateMany({
      where: {
        id: schedule.id,
        enabled: true,
        OR: [
          { nextRunAt: null },
          { nextRunAt: { lte: scanAt } },
        ],
      },
      data: {
        lastRunAt: scanAt,
        nextRunAt,
      },
    });

    if (locked.count === 0) continue;

    const jobId = await createAndQueueMaintenanceJob({
      kind: schedule.kind,
      dryRun: schedule.dryRun,
      requestedById: schedule.createdById,
      targetPersonIds: schedule.targetPersonIds,
      options: isRecord(schedule.options) ? schedule.options : {},
      triggerSource: 'schedule',
    });

    await prisma.maintenanceSchedule.update({
      where: { id: schedule.id },
      data: {
        lastJobId: jobId,
        runCount: { increment: 1 },
      },
    });

    queued += 1;
  }

  return {
    scannedAt: scanAt.toISOString(),
    dueCount: schedules.length,
    queued,
    skipped,
  };
}

async function resolveTargets(kind: MaintenanceKind, targetPersonIds: string[], options: Prisma.JsonValue): Promise<MaintenancePerson[]> {
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

async function runNewPersonBuildJob(jobId: string, dryRun: boolean, options: Prisma.JsonValue) {
  const qids = getTargetQids(options);
  const sourceTypes = getSourceTypes(options);
  const refreshMode = getRefreshMode(options);

  await prisma.maintenanceJob.update({
    where: { id: jobId },
    data: { progressTotal: qids.length },
  });

  if (qids.length === 0) {
    await appendMaintenanceLog(jobId, 'warning', '没有填写需要构建的新人物 QID');
  }

  for (const [index, qid] of qids.entries()) {
    if (await finishIfCancellationRequested(jobId)) return;

    const existing = await prisma.people.findUnique({
      where: { qid },
      select: personSelect(),
    });

    if (dryRun) {
      await appendMaintenanceLog(jobId, 'info', existing ? `dry-run: ${qid} 已存在，将触发 ${existing.name}` : `dry-run: 将创建并构建 ${qid}`, {
        qid,
        personId: existing?.id,
        sourceTypes,
      });
    } else {
      const { person, created } = existing
        ? { person: refreshMode === 'rebuild' ? await preparePersonForRebuild(existing) : existing, created: false }
        : { person: await createPersonFromQid(qid), created: true };

      const triggerMetadata = await triggerPersonUpdate(person, options);
      await appendMaintenanceLog(jobId, 'info', `${created ? '已创建并投递' : '已存在并投递'} ${person.name}`, {
        qid,
        personId: person.id,
        ...triggerMetadata,
      });
    }

    await prisma.maintenanceJob.update({
      where: { id: jobId },
      data: { progressDone: index + 1 },
    });
  }

  if (await finishIfCancellationRequested(jobId)) return;

  await prisma.maintenanceJob.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      completedAt: new Date(),
    },
  });

  await appendMaintenanceLog(jobId, 'info', dryRun ? `dry-run 完成，共检查 ${qids.length} 个 QID` : `任务投递完成，共投递 ${qids.length} 个 QID`);
}

async function finishIfCancellationRequested(jobId: string): Promise<boolean> {
  const job = await prisma.maintenanceJob.findUnique({
    where: { id: jobId },
    select: {
      status: true,
      progressDone: true,
      progressTotal: true,
    },
  });

  if (!job || job.status !== 'cancelling') return false;

  await prisma.maintenanceJob.update({
    where: { id: jobId },
    data: {
      status: 'cancelled',
      completedAt: new Date(),
      errorMessage: null,
    },
  });
  await appendMaintenanceLog(jobId, 'warning', `任务已取消，已处理 ${job.progressDone}/${job.progressTotal}`);
  return true;
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

async function triggerPersonUpdate(person: MaintenancePerson, options: Prisma.JsonValue) {
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

export async function appendMaintenanceLog(
  jobId: string,
  level: 'info' | 'warning' | 'error',
  message: string,
  metadata?: Record<string, unknown>,
) {
  await prisma.maintenanceJobLog.create({
    data: {
      jobId,
      level,
      message,
      metadata: metadata ? toJsonObject(metadata) : undefined,
    },
  });
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

function commandForJob(kind: MaintenanceKind, dryRun: boolean, options: Record<string, unknown>): string {
  const mode = dryRun ? 'dry-run' : 'execute';
  const refreshMode = getRefreshMode(options);
  if (kind === 'new_person_build') return `internal:${mode}:${refreshMode}:person/created:new`;
  if (kind === 'single_person_refresh') return `internal:${mode}:person/created:single`;
  if (kind === 'multi_person_refresh') return `internal:${mode}:person/created:multi`;
  return `internal:${mode}:person/created:all`;
}

function isMaintenanceKind(value: string): value is MaintenanceKind {
  return value === 'new_person_build' || value === 'single_person_refresh' || value === 'multi_person_refresh' || value === 'all_people_refresh';
}

function toJsonObject(value: Record<string, unknown>): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getOption(value: Prisma.JsonValue, key: string): unknown {
  return isRecord(value) ? value[key] : undefined;
}

function getStringOption(value: Prisma.JsonValue, key: string): string {
  const option = getOption(value, key);
  return typeof option === 'string' ? option.trim() : '';
}

function getRefreshMode(options: Prisma.JsonValue | Record<string, unknown>): MaintenanceRefreshMode {
  const value = isRecord(options) ? options.refreshMode : undefined;
  if (value === 'force' || value === 'rebuild') return value;
  return 'incremental';
}

function getSourceTypes(options: Prisma.JsonValue | Record<string, unknown>): MaintenanceSourceType[] {
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

function getTargetQids(options: Prisma.JsonValue | Record<string, unknown>): string[] {
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

function addHours(value: Date, hours: number): Date {
  return new Date(value.getTime() + hours * 60 * 60 * 1000);
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
