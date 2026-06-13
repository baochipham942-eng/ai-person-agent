import crypto from 'crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env', quiet: true });
dotenv.config({ path: '.env.local', quiet: true });

const prisma = new PrismaClient();
const TOPIC_REGISTRY = JSON.parse(
  readFileSync(new URL('../../lib/person-directory-topics.json', import.meta.url), 'utf8')
);

const ACTIVITY_SOURCE_TYPES = ['openalex', 'github', 'youtube', 'exa', 'podcast', 'career'];
const SOURCE_TYPE_LABELS = {
  openalex: 'OpenAlex',
  github: 'GitHub',
  youtube: 'YouTube',
  exa: 'Web',
  podcast: 'Podcast',
  career: 'Career',
};
const TOKEN_TTL_MS = 180 * 24 * 60 * 60 * 1000;
const TOPIC_ALIASES = Object.fromEntries(
  TOPIC_REGISTRY.topics.map(topic => [topic.label, topic.aliases || []])
);
const TOPIC_CANONICAL_BY_ALIAS = new Map();

for (const topic of TOPIC_REGISTRY.topics) {
  TOPIC_CANONICAL_BY_ALIAS.set(normalizeTopicKey(topic.label), topic.label);
  for (const alias of topic.aliases || []) {
    TOPIC_CANONICAL_BY_ALIAS.set(normalizeTopicKey(alias), topic.label);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  assertSendConfirmation(options);

  if (options.preflight) {
    const report = await runPreflight(options);
    console.log(JSON.stringify(report, null, 2));
    if (!report.pass) process.exitCode = 1;
    return;
  }

  if (options.send) {
    const report = await runPreflight(options);
    if (!report.pass) {
      console.error(JSON.stringify(report, null, 2));
      throw new Error('Newsletter send preflight failed. Fix the failed checks before sending.');
    }
  }

  const profiles = await prisma.userProfile.findMany({
    where: {
      newsletterFrequency: { not: 'none' },
      newsletterEmail: { not: null },
    },
    select: {
      id: true,
      userId: true,
      peopleInterests: true,
      topicInterests: true,
      subscribedPeople: true,
      newsletterFrequency: true,
      newsletterEmail: true,
      user: {
        select: {
          username: true,
          nickname: true,
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: options.limit,
  });

  const drafts = [];
  const deliveries = [];
  for (const profile of profiles) {
    const draft = await buildDigestDraft(profile, options);
    drafts.push(draft);
    if (options.send) {
      const result = await sendDigestEmail(draft, {
        deliveryKey: buildDeliveryKey(profile, options),
      });
      deliveries.push(result);
      await recordDeliveryResult(profile, draft, result);
    } else if (options.record) {
      await recordDraft(profile, draft);
    }
  }

  console.log(JSON.stringify({
    dryRun: !options.record && !options.send,
    recorded: options.record,
    sendRequested: options.send,
    subscriptions: profiles.length,
    days: options.days,
    limit: options.limit,
    generated: drafts.length,
    delivery: summarizeDelivery(deliveries),
    sample: drafts.slice(0, 3).map(draft => ({
      email: draft.email,
      subject: draft.subject,
      eventCount: draft.events.length,
      watchlist: draft.watchlist,
      preview: draft.preview,
      unsubscribeUrl: draft.unsubscribeUrl,
    })),
  }, null, 2));

  if (!options.record && !options.send) {
    console.log('Dry run only. Re-run with --record after the NewsletterDeliveryLog migration is applied, or --send after provider env is configured.');
  }
}

async function buildDigestDraft(profile, options) {
  const watchlist = normalizeProfileWatchlist(profile);
  const since = new Date(Date.now() - options.days * 24 * 60 * 60 * 1000);
  const [people, events] = await Promise.all([
    loadPeople(watchlist.people),
    loadEvents(watchlist, since, options.eventLimit),
  ]);
  const topicLabels = watchlist.topics.slice(0, 3).join('、');
  const personLabels = people.map(person => person.name).slice(0, 3).join('、');
  const scope = personLabels || topicLabels || watchlist.organizations.slice(0, 2).join('、') || 'AI 圈';
  const subject = `AI 人物库周报：${scope} 的 ${events.length} 条动态`;
  const unsubscribeUrl = buildUnsubscribeUrl(profile);
  const preview = events.slice(0, 5).map(event => `${event.personName}: ${event.title}`);

  return {
    userId: profile.userId,
    email: profile.newsletterEmail,
    frequency: profile.newsletterFrequency,
    subject,
    preview,
    unsubscribeUrl,
    watchlist: {
      people: people.map(person => person.name),
      topics: watchlist.topics,
      organizations: watchlist.organizations,
      fallbackGlobal: watchlist.people.length + watchlist.topics.length + watchlist.organizations.length === 0,
    },
    events,
    textBody: buildTextBody(profile, subject, events, unsubscribeUrl),
  };
}

async function loadPeople(personIds) {
  if (personIds.length === 0) return [];
  return prisma.people.findMany({
    where: {
      id: { in: personIds },
      status: { in: ['ready', 'active'] },
    },
    select: {
      id: true,
      name: true,
      currentTitle: true,
      organization: true,
      topics: true,
    },
    orderBy: [{ influenceScore: 'desc' }, { name: 'asc' }],
    take: 12,
  });
}

async function loadEvents(watchlist, since, limit) {
  const targetCount = watchlist.people.length + watchlist.topics.length + watchlist.organizations.length;
  const personWhere = buildPersonWhere(watchlist);
  const where = {
    sourceType: { in: ACTIVITY_SOURCE_TYPES },
    fetchStatus: 'success',
    url: { not: '' },
    title: { not: '' },
    OR: [
      { publishedAt: { gte: since } },
      { fetchedAt: { gte: since } },
    ],
    ...(targetCount > 0 && {
      AND: [{
        OR: [
          ...(watchlist.people.length > 0 ? [{ personId: { in: watchlist.people } }] : []),
          ...(personWhere ? [{ person: personWhere }] : []),
        ],
      }],
    }),
  };

  const rows = await prisma.rawPoolItem.findMany({
    where,
    select: {
      id: true,
      sourceType: true,
      url: true,
      title: true,
      text: true,
      publishedAt: true,
      fetchedAt: true,
      metadata: true,
      person: {
        select: {
          id: true,
          name: true,
          currentTitle: true,
          organization: true,
          topics: true,
        },
      },
    },
    orderBy: [{ publishedAt: 'desc' }, { fetchedAt: 'desc' }],
    take: limit * 2,
  });

  return dedupeEvents(rows.map(toDigestEvent).filter(Boolean)).slice(0, limit);
}

function buildPersonWhere(watchlist) {
  const filters = [];
  if (watchlist.topics.length > 0) {
    filters.push({ topics: { hasSome: expandTopicAliases(watchlist.topics) } });
  }
  if (watchlist.organizations.length > 0) {
    filters.push({
      OR: [
        { organization: { hasSome: watchlist.organizations } },
        ...watchlist.organizations.map(organization => ({
          currentTitle: { contains: organization, mode: 'insensitive' },
        })),
      ],
    });
  }
  if (filters.length === 0) return null;
  return { OR: filters };
}

function toDigestEvent(row) {
  if (!row?.url || !row?.title || !row?.person) return null;
  const occurredAt = row.publishedAt || row.fetchedAt;
  return {
    id: row.id,
    personId: row.person.id,
    personName: row.person.name,
    personCurrentTitle: row.person.currentTitle,
    sourceType: row.sourceType,
    sourceLabel: SOURCE_TYPE_LABELS[row.sourceType] || row.sourceType,
    title: row.title,
    summary: buildSummary(row.text),
    url: row.url,
    occurredAt: occurredAt ? occurredAt.toISOString() : null,
    detectedAt: row.fetchedAt.toISOString(),
    topics: uniqueStrings(row.person.topics.map(normalizeTopic)).slice(0, 4),
    organizations: row.person.organization.slice(0, 3),
  };
}

function normalizeProfileWatchlist(profile) {
  const topicState = normalizeTopicInterests(profile.topicInterests);
  return {
    people: uniqueStrings(profile.subscribedPeople || []),
    topics: topicState.topics,
    organizations: topicState.organizations,
  };
}

function normalizeTopicInterests(value) {
  if (!isRecord(value)) return { topics: [], organizations: [] };
  const topics = Array.isArray(value.topics)
    ? uniqueStrings(value.topics)
    : objectKeysFromTruthyValues(value.topicMap);
  const organizations = Array.isArray(value.organizations)
    ? uniqueStrings(value.organizations)
    : objectKeysFromTruthyValues(value.organizationMap);
  const legacyTopics = Object.keys(value)
    .filter(key => !['topics', 'organizations', 'topicMap', 'organizationMap'].includes(key))
    .filter(key => Boolean(value[key]));

  return {
    topics: uniqueStrings([...topics, ...legacyTopics].map(normalizeTopic)),
    organizations,
  };
}

function buildTextBody(profile, subject, events, unsubscribeUrl) {
  const name = profile.user?.nickname || profile.user?.username || '你好';
  const lines = [
    `${name}，${subject}`,
    '',
    ...events.slice(0, 8).map((event, index) => `${index + 1}. ${event.personName} - ${event.title}\n${event.url}`),
    '',
    `退订: ${unsubscribeUrl}`,
  ];

  return lines.join('\n');
}

function buildUnsubscribeUrl(profile) {
  const baseUrl = (
    process.env.PRODUCTION_BASE_URL
    || process.env.NEXT_PUBLIC_SITE_URL
    || process.env.SITE_URL
    || 'http://localhost:4001'
  ).replace(/\/$/, '');
  const token = buildUnsubscribeToken(profile);
  return `${baseUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(token)}`;
}

function buildUnsubscribeToken(profile) {
  const payload = {
    v: 1,
    profileId: profile.id,
    userId: profile.userId,
    email: profile.newsletterEmail,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${encoded}.${signTokenPayload(encoded)}`;
}

async function recordDraft(profile, draft) {
  await prisma.newsletterDeliveryLog.create({
    data: {
      userId: profile.userId,
      email: draft.email,
      frequency: draft.frequency,
      deliveryType: 'weekly_digest',
      subject: draft.subject,
      status: 'dry_run',
      provider: 'dry_run',
      attempts: 0,
      payload: {
        provider: 'dry_run',
        preview: draft.preview,
        unsubscribeUrl: draft.unsubscribeUrl,
        watchlist: draft.watchlist,
        events: draft.events.map(event => ({
          id: event.id,
          personId: event.personId,
          title: event.title,
          url: event.url,
          sourceLabel: event.sourceLabel,
          occurredAt: event.occurredAt,
        })),
      },
    },
  });
}

async function recordDeliveryResult(profile, draft, result) {
  await prisma.newsletterDeliveryLog.create({
    data: {
      userId: profile.userId,
      email: draft.email,
      frequency: draft.frequency,
      deliveryType: 'weekly_digest',
      subject: draft.subject,
      status: result.status,
      provider: result.provider,
      providerMessageId: result.providerMessageId,
      attempts: result.attempts,
      errorMessage: result.errorMessage,
      lastAttemptAt: result.provider === 'dry_run' ? null : new Date(),
      sentAt: result.sentAt,
      payload: buildDeliveryPayload(draft, result),
    },
  });
}

function parseArgs(args) {
  const options = {
    days: 7,
    limit: 5,
    eventLimit: 8,
    record: false,
    send: false,
    preflight: false,
    confirmNewsletterSend: false,
    rawArgs: args,
  };

  for (const arg of args) {
    if (arg === '--preflight') options.preflight = true;
    if (arg === '--record') options.record = true;
    if (arg === '--send') {
      options.send = true;
      options.record = true;
    }
    if (arg === '--confirm-newsletter-send') options.confirmNewsletterSend = true;
    if (arg.startsWith('--days=')) options.days = clampInteger(arg.slice('--days='.length), 1, 30, options.days);
    if (arg.startsWith('--limit=')) options.limit = clampInteger(arg.slice('--limit='.length), 1, 5, options.limit);
    if (arg.startsWith('--event-limit=')) options.eventLimit = clampInteger(arg.slice('--event-limit='.length), 1, 8, options.eventLimit);
  }

  return options;
}

function assertSendConfirmation(options) {
  if (!options.send) return;
  if (options.confirmNewsletterSend || parentCommandHasNewsletterConfirmation()) return;
  throw new Error('Newsletter sending requires --confirm-newsletter-send.');
}

function parentCommandHasNewsletterConfirmation() {
  try {
    const command = execFileSync('ps', ['-o', 'command=', '-p', String(process.ppid)], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    return command.includes('--confirm-newsletter-send');
  } catch {
    return false;
  }
}

async function runPreflight(options) {
  const deliveryStore = await checkDeliveryStore();
  const checks = [
    {
      key: 'smallBatchLimit',
      pass: options.limit <= 5,
      detail: `limit=${options.limit}`,
    },
    {
      key: 'smallBatchEventLimit',
      pass: options.eventLimit <= 8,
      detail: `eventLimit=${options.eventLimit}`,
    },
    {
      key: 'deliveryStore',
      pass: deliveryStore.ready,
      detail: deliveryStore.detail,
    },
    {
      key: 'siteUrl',
      pass: Boolean(process.env.PRODUCTION_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL),
      detail: envDetail(['PRODUCTION_BASE_URL', 'NEXT_PUBLIC_SITE_URL', 'SITE_URL']),
    },
    {
      key: 'tokenSecret',
      pass: Boolean(process.env.NEWSLETTER_TOKEN_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET),
      detail: envDetail(['NEWSLETTER_TOKEN_SECRET', 'AUTH_SECRET', 'NEXTAUTH_SECRET']),
    },
    {
      key: 'sendConfirmation',
      pass: !options.send || options.confirmNewsletterSend || parentCommandHasNewsletterConfirmation(),
      detail: options.send ? '--confirm-newsletter-send required for send mode' : 'not sending',
    },
    {
      key: 'provider',
      pass: !options.send || process.env.NEWSLETTER_EMAIL_PROVIDER === 'resend',
      detail: `NEWSLETTER_EMAIL_PROVIDER=${process.env.NEWSLETTER_EMAIL_PROVIDER || ''}`,
    },
    {
      key: 'sendEnabled',
      pass: !options.send || process.env.NEWSLETTER_SEND_ENABLED === 'true',
      detail: `NEWSLETTER_SEND_ENABLED=${process.env.NEWSLETTER_SEND_ENABLED || ''}`,
    },
    {
      key: 'resendApiKey',
      pass: !options.send || Boolean(process.env.RESEND_API_KEY),
      detail: envDetail(['RESEND_API_KEY']),
    },
    {
      key: 'fromEmail',
      pass: !options.send || Boolean(process.env.NEWSLETTER_FROM_EMAIL),
      detail: envDetail(['NEWSLETTER_FROM_EMAIL']),
    },
  ];

  return {
    mode: options.send ? 'send_preflight' : options.record ? 'record_preflight' : 'dry_run_preflight',
    pass: checks.every(check => check.pass),
    sendRequested: options.send,
    recordRequested: options.record,
    days: options.days,
    limit: options.limit,
    eventLimit: options.eventLimit,
    checks,
  };
}

async function checkDeliveryStore() {
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        to_regclass('public."NewsletterDeliveryLog"') IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'NewsletterDeliveryLog'
            AND column_name = 'provider'
        ) AS "ready"
    `;
    const ready = Boolean(rows?.[0]?.ready);
    return {
      ready,
      detail: ready ? 'NewsletterDeliveryLog provider columns available' : 'NewsletterDeliveryLog provider columns missing',
    };
  } catch (error) {
    return {
      ready: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

function envDetail(names) {
  const present = names.filter(name => Boolean(process.env[name]));
  return present.length > 0 ? `${present.join(' or ')} configured` : `${names.join(' or ')} missing`;
}

function signTokenPayload(encodedPayload) {
  return crypto
    .createHmac('sha256', newsletterSecret())
    .update(encodedPayload)
    .digest('base64url');
}

function newsletterSecret() {
  return process.env.NEWSLETTER_TOKEN_SECRET
    || process.env.AUTH_SECRET
    || process.env.NEXTAUTH_SECRET
    || 'local-newsletter-token-secret';
}

function dedupeEvents(events) {
  const seen = new Set();
  const result = [];
  for (const event of events) {
    if (seen.has(event.id)) continue;
    seen.add(event.id);
    result.push(event);
  }
  return result;
}

function buildSummary(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (!normalized || normalized === 'null') return null;
  return normalized.length > 140 ? `${normalized.slice(0, 137)}...` : normalized;
}

function objectKeysFromTruthyValues(value) {
  if (!isRecord(value)) return [];
  return Object.keys(value).filter(key => Boolean(value[key]));
}

function uniqueStrings(values) {
  return [...new Set(values.map(value => String(value).trim()).filter(Boolean))];
}

function expandTopicAliases(topics) {
  return uniqueStrings(topics.flatMap(topic => {
    const canonical = normalizeTopic(topic);
    return [canonical, topic, ...(TOPIC_ALIASES[canonical] || [])];
  }));
}

function normalizeTopic(topic) {
  return TOPIC_CANONICAL_BY_ALIAS.get(normalizeTopicKey(topic)) || topic;
}

function normalizeTopicKey(value) {
  return String(value || '').trim().toLowerCase().replace(/\s+/g, '');
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampInteger(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function resolveEmailProvider(sendRequested) {
  if (!sendRequested) return 'dry_run';
  return String(process.env.NEWSLETTER_EMAIL_PROVIDER || '').trim().toLowerCase() === 'resend'
    ? 'resend'
    : 'dry_run';
}

async function sendDigestEmail(draft, options) {
  const provider = resolveEmailProvider(true);
  if (provider === 'dry_run') {
    return {
      provider,
      status: 'dry_run',
      providerMessageId: null,
      attempts: 0,
      errorMessage: null,
      sentAt: null,
    };
  }

  if (process.env.NEWSLETTER_SEND_ENABLED !== 'true') {
    return {
      provider,
      status: 'failed',
      providerMessageId: null,
      attempts: 0,
      errorMessage: 'NEWSLETTER_SEND_ENABLED must be true before sending email',
      sentAt: null,
    };
  }

  return sendWithResendWithRetry(draft, options.deliveryKey);
}

async function sendWithResendWithRetry(draft, deliveryKey) {
  const maxAttempts = clampInteger(process.env.NEWSLETTER_SEND_MAX_ATTEMPTS, 1, 3, 2);
  let lastResult = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    lastResult = await sendWithResend(draft, deliveryKey);
    if (lastResult.status === 'sent' || !lastResult.retryable) {
      return { ...lastResult, attempts: attempt };
    }
  }

  return {
    provider: 'resend',
    status: 'failed',
    providerMessageId: lastResult?.providerMessageId || null,
    attempts: maxAttempts,
    errorMessage: lastResult?.errorMessage || 'Email send failed',
    sentAt: null,
  };
}

async function sendWithResend(draft, deliveryKey) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NEWSLETTER_FROM_EMAIL;
  if (!apiKey || !from) {
    return {
      provider: 'resend',
      status: 'failed',
      providerMessageId: null,
      attempts: 0,
      errorMessage: 'RESEND_API_KEY and NEWSLETTER_FROM_EMAIL are required',
      sentAt: null,
      retryable: false,
    };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(deliveryKey ? { 'Idempotency-Key': deliveryKey } : {}),
      },
      body: JSON.stringify({
        from,
        to: [draft.email],
        subject: draft.subject,
        html: buildHtmlBody(draft),
        text: draft.textBody,
        ...(process.env.NEWSLETTER_REPLY_TO ? { reply_to: process.env.NEWSLETTER_REPLY_TO } : {}),
      }),
    });
    const data = await safeJson(response);

    if (!response.ok) {
      return {
        provider: 'resend',
        status: 'failed',
        providerMessageId: null,
        attempts: 1,
        errorMessage: extractProviderError(data, response.status),
        sentAt: null,
        retryable: response.status === 429 || response.status >= 500,
      };
    }

    return {
      provider: 'resend',
      status: 'sent',
      providerMessageId: typeof data?.id === 'string' ? data.id : null,
      attempts: 1,
      errorMessage: null,
      sentAt: new Date(),
      retryable: false,
    };
  } catch (error) {
    return {
      provider: 'resend',
      status: 'failed',
      providerMessageId: null,
      attempts: 1,
      errorMessage: error instanceof Error ? error.message : String(error),
      sentAt: null,
      retryable: true,
    };
  }
}

function buildDeliveryPayload(draft, result) {
  return {
    provider: result.provider,
    providerMessageId: result.providerMessageId,
    preview: draft.preview,
    unsubscribeUrl: draft.unsubscribeUrl,
    watchlist: draft.watchlist,
    events: draft.events.map(event => ({
      id: event.id,
      personId: event.personId,
      personName: event.personName,
      title: event.title,
      url: event.url,
      sourceLabel: event.sourceLabel,
      occurredAt: event.occurredAt,
    })),
  };
}

function buildHtmlBody(draft) {
  const rows = draft.events.slice(0, 8).map(event => `
    <li style="margin:0 0 16px 0;">
      <div style="font-weight:600;color:#1c1917;">${escapeHtml(event.personName)}</div>
      <a href="${escapeAttribute(event.url)}" style="color:#ea580c;text-decoration:none;">${escapeHtml(event.title)}</a>
      ${event.sourceLabel ? `<div style="margin-top:4px;color:#78716c;font-size:12px;">${escapeHtml(event.sourceLabel)}</div>` : ''}
    </li>
  `).join('');

  return `<!doctype html>
<html>
  <body style="margin:0;background:#fafaf9;color:#292524;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
    <div style="max-width:640px;margin:0 auto;padding:28px 20px;">
      <div style="background:#ffffff;border:1px solid #e7e5e4;border-radius:8px;padding:24px;">
        <p style="margin:0 0 8px 0;color:#ea580c;font-size:12px;font-weight:600;">AI 人物库周报</p>
        <h1 style="margin:0 0 18px 0;font-size:22px;line-height:1.35;color:#0c0a09;">${escapeHtml(draft.subject)}</h1>
        <ol style="margin:0;padding-left:20px;">${rows || '<li style="color:#78716c;">本期没有新的关注动态。</li>'}</ol>
        <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e7e5e4;font-size:12px;line-height:1.6;color:#78716c;">
          这封邮件来自你的 AI 人物库关注列表。<a href="${escapeAttribute(draft.unsubscribeUrl)}" style="color:#78716c;">退订</a>
        </div>
      </div>
    </div>
  </body>
</html>`;
}

function buildDeliveryKey(profile, options) {
  const bucket = new Date().toISOString().slice(0, 10);
  return `weekly-digest:${profile.id}:${bucket}:days-${options.days}`;
}

function summarizeDelivery(deliveries) {
  return {
    total: deliveries.length,
    sent: deliveries.filter(delivery => delivery.status === 'sent').length,
    failed: deliveries.filter(delivery => delivery.status === 'failed').length,
    dryRun: deliveries.filter(delivery => delivery.status === 'dry_run').length,
    providers: countBy(deliveries, delivery => delivery.provider),
  };
}

function countBy(values, getKey) {
  return values.reduce((acc, value) => {
    const key = getKey(value) || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function extractProviderError(data, status) {
  if (data && typeof data.message === 'string') return data.message;
  if (data && typeof data.error === 'string') return data.error;
  return `Email provider returned HTTP ${status}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

main()
  .catch(error => {
    if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2021' || error.code === 'P2022')) {
      console.error('NewsletterDeliveryLog table or provider columns are missing. Apply the newsletter migrations before running with --record or --send.');
      process.exitCode = 1;
      return;
    }
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
