/**
 * Export person-page factual claims for source-backed review.
 *
 * This is intentionally read-only. It turns every visible or content-bearing
 * person field into a claim that can be reviewed by an LLM or a human.
 *
 * Usage:
 *   node scripts/audit/export_fact_claims.mjs
 *   node scripts/audit/export_fact_claims.mjs --person="Dario Amodei"
 *   node scripts/audit/export_fact_claims.mjs --out=docs/audit-2026-06/data/fact_claims.jsonl
 */
import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

const DEFAULT_OUT = 'docs/audit-2026-06/data/fact_claims.jsonl';
const OUT = getArg('--out') || DEFAULT_OUT;
const SUMMARY_OUT = getArg('--summary-out') || OUT.replace(/\.jsonl$/i, '_summary.json');
const PERSON_FILTER = getArg('--person');
const PERSON_ID_FILTER = getArg('--person-id');
const STATUS_FILTER = getArg('--status');
const CLAIM_TYPE_FILTER = getArg('--claim-type');

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL');
}

const sql = neon(process.env.DATABASE_URL);

const SOURCE_DISPLAY_LIMITS = {
  openalex: 10,
  github: 6,
  exa: 10,
  podcast: 20,
  youtube: 12,
};

const SOURCE_SURFACE = {
  openalex: 'featured.papers',
  github: 'featured.opensource',
  exa: 'featured.blogs',
  podcast: 'featured.podcast',
  youtube: 'video',
};

const REVERSE_RELATION_TYPE = {
  advisor: 'advisee',
  advisee: 'advisor',
  successor: 'predecessor',
  predecessor: 'successor',
};

function getArg(name) {
  const prefix = `${name}=`;
  return process.argv.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asRecord(value) {
  return isRecord(value) ? value : {};
}

function compact(value, max = 600) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function sha(value, length = 12) {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, length);
}

function claimId(personId, fieldPath, value) {
  return `${personId}:${fieldPath}:${sha(JSON.stringify(value))}`;
}

function sourceHints(...items) {
  const hints = [];
  const seen = new Set();
  for (const item of items.flat()) {
    if (!item) continue;
    const hint = typeof item === 'string' ? { url: item } : item;
    if (!hint.url && !hint.label) continue;
    const key = `${hint.url || ''}|${hint.label || ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    hints.push(hint);
  }
  return hints;
}

function personContext(person) {
  return {
    currentTitle: person.currentTitle || null,
    occupation: asArray(person.occupation),
    organization: asArray(person.organization),
    topics: asArray(person.topics),
    status: person.status,
  };
}

function pushClaim(claims, person, input) {
  if (CLAIM_TYPE_FILTER && input.claimType !== CLAIM_TYPE_FILTER) return;
  const value = input.value ?? input.claimText;
  claims.push({
    claimId: claimId(person.id, input.fieldPath, value),
    personId: person.id,
    person: person.name,
    status: person.status,
    surface: input.surface,
    fieldPath: input.fieldPath,
    objectType: input.objectType || null,
    objectId: input.objectId || null,
    objectLabel: input.objectLabel || null,
    claimType: input.claimType,
    priority: input.priority || 'medium',
    claimText: input.claimText,
    verificationQuestion: input.verificationQuestion,
    expectedVerdicts: [
      'supported',
      'unsupported',
      'over_attributed',
      'wrong_person',
      'stale',
      'needs_source',
      'unclear',
    ],
    value,
    sourceHints: sourceHints(input.sourceHints),
    personContext: personContext(person),
  });
}

function addPeopleFieldClaims(claims, person) {
  if (person.description) {
    pushClaim(claims, person, {
      surface: 'profile',
      fieldPath: 'People.description',
      claimType: 'profile_summary',
      priority: 'medium',
      claimText: `${person.name} 的简介：${compact(person.description)}`,
      verificationQuestion: '这段人物简介是否准确描述了该人物，且没有把其他人、公司或领域事实误归到此人？',
      value: { description: person.description },
      sourceHints: person.sourceWhitelist?.map((url) => ({ url, label: 'sourceWhitelist' })),
    });
  }

  if (person.whyImportant) {
    pushClaim(claims, person, {
      surface: 'core.whyImportant',
      fieldPath: 'People.whyImportant',
      claimType: 'why_important',
      priority: 'high',
      claimText: `${person.name} 为什么值得关注：${compact(person.whyImportant)}`,
      verificationQuestion: '这段“为什么值得关注”是否事实准确、贡献归因正确，并且没有把机构级、团队级或传闻级内容写成个人确定贡献？',
      value: { whyImportant: person.whyImportant },
      sourceHints: person.sourceWhitelist?.map((url) => ({ url, label: 'sourceWhitelist' })),
    });
  }

  if (person.currentTitle) {
    pushClaim(claims, person, {
      surface: 'profile.currentTitle',
      fieldPath: 'People.currentTitle',
      claimType: 'current_title',
      priority: 'high',
      claimText: `${person.name} 当前职位是：${person.currentTitle}`,
      verificationQuestion: '这个当前职位是否真实且仍然足够新？如果只是历史职位、推测职位或缺少来源，应标记 stale 或 needs_source。',
      value: { currentTitle: person.currentTitle },
      sourceHints: person.sourceWhitelist?.map((url) => ({ url, label: 'sourceWhitelist' })),
    });
  }

  for (const [idx, occupation] of asArray(person.occupation).entries()) {
    pushClaim(claims, person, {
      surface: 'profile.occupation',
      fieldPath: `People.occupation[${idx}]`,
      claimType: 'occupation',
      priority: 'medium',
      claimText: `${person.name} 的职业/身份包含：${occupation}`,
      verificationQuestion: '这个职业或身份标签是否适用于该人物，且没有过度泛化或过时？',
      value: { occupation },
      sourceHints: person.sourceWhitelist?.map((url) => ({ url, label: 'sourceWhitelist' })),
    });
  }

  for (const [idx, organization] of asArray(person.organization).entries()) {
    pushClaim(claims, person, {
      surface: 'profile.organization',
      fieldPath: `People.organization[${idx}]`,
      claimType: 'organization_affiliation',
      priority: 'medium',
      claimText: `${person.name} 关联机构包含：${organization}`,
      verificationQuestion: '这个机构关联是否真实，且符合当前/历史语境？如果只是投资方、报道来源或同名实体，应标记 unsupported 或 wrong_person。',
      value: { organization },
      sourceHints: person.sourceWhitelist?.map((url) => ({ url, label: 'sourceWhitelist' })),
    });
  }

  for (const [idx, topic] of asArray(person.topics).entries()) {
    pushClaim(claims, person, {
      surface: 'profile.topics',
      fieldPath: `People.topics[${idx}]`,
      claimType: 'topic_membership',
      priority: 'medium',
      claimText: `${person.name} 被归入话题：${topic}`,
      verificationQuestion: '这个话题标签是否能由该人物的真实研究、产品、投资、教学或公开内容支撑？',
      value: { topic },
      sourceHints: person.sourceWhitelist?.map((url) => ({ url, label: 'sourceWhitelist' })),
    });
  }

  for (const [idx, link] of asArray(person.officialLinks).entries()) {
    const record = asRecord(link);
    pushClaim(claims, person, {
      surface: 'profile.officialLinks',
      fieldPath: `People.officialLinks[${idx}]`,
      objectType: 'officialLink',
      objectLabel: record.type || record.url || null,
      claimType: 'official_link',
      priority: 'high',
      claimText: `${person.name} 的官方账号/链接：${record.type || 'link'} ${record.url || ''}`,
      verificationQuestion: '这个链接是否确实属于该人物本人或其官方主页，而不是同名账号、机构页面、粉丝页或错误链接？',
      value: record,
      sourceHints: [{ url: record.url, label: record.type || 'official link' }],
    });
  }
}

function addStructuredJsonClaims(claims, person) {
  const products = asArray(person.products);
  for (const [idx, product] of products.entries()) {
    const record = asRecord(product);
    const name = record.name || `product-${idx + 1}`;
    pushClaim(claims, person, {
      surface: 'featured.products',
      fieldPath: `People.products[${idx}]`,
      objectType: 'product',
      objectLabel: name,
      claimType: 'representative_achievement',
      priority: 'high',
      claimText: `${name} 被展示为 ${person.name} 关联的代表成果。${record.role ? `人物角色/贡献口径：${record.role}。` : ''}${record.org ? `机构：${record.org}。` : ''}${record.year ? `年份：${record.year}。` : ''}${record.description ? `说明：${compact(record.description, 260)}` : ''}`,
      verificationQuestion: '这条代表成果展示是否成立：人物角色/贡献口径是否足以支撑它出现在个人页？创始人/CEO 可以展示其领导的公司级产品族，但单个模型版本、API/SDK/商业入口、营销口径或缺少个人贡献角色的团队成果应标记 over_attributed 或 rewrite。',
      value: record,
      sourceHints: [
        { url: record.url, label: 'product url' },
        ...(person.sourceWhitelist || []).map((url) => ({ url, label: 'sourceWhitelist' })),
      ],
    });
  }

  const topicRanks = asRecord(person.topicRanks);
  for (const [topic, rank] of Object.entries(topicRanks)) {
    pushClaim(claims, person, {
      surface: 'featured.topics',
      fieldPath: `People.topicRanks.${topic}`,
      objectType: 'topicRank',
      objectLabel: topic,
      claimType: 'topic_rank',
      priority: 'medium',
      claimText: `${person.name} 在话题 ${topic} 的排名为 Top ${rank}`,
      verificationQuestion: '这个话题排名是否与站内排序口径和事实贡献相符？如果缺少排序依据，应标记 needs_source 或 unclear。',
      value: { topic, rank },
      sourceHints: person.sourceWhitelist?.map((url) => ({ url, label: 'sourceWhitelist' })),
    });
  }

  const topicDetails = asArray(person.topicDetails);
  for (const [idx, detail] of topicDetails.entries()) {
    const record = asRecord(detail);
    pushClaim(claims, person, {
      surface: 'featured.topics',
      fieldPath: `People.topicDetails[${idx}]`,
      objectType: 'topicDetail',
      objectLabel: record.topic || null,
      claimType: 'topic_contribution',
      priority: 'high',
      claimText: `${person.name} 对话题 ${record.topic || 'unknown'} 的贡献：${compact(record.reason || record.description || '', 320)}`,
      verificationQuestion: '这条话题贡献是否事实准确，且与该人物直接相关？topic、rank、reason/description、paperCount、citations 和 quote 都需要检查是否互相匹配。',
      value: record,
      sourceHints: [
        { url: record.quote?.url, label: record.quote?.source || 'topic quote' },
        ...(person.sourceWhitelist || []).map((url) => ({ url, label: 'sourceWhitelist' })),
      ],
    });
  }

  for (const [idx, quote] of asArray(person.quotes).entries()) {
    const record = asRecord(quote);
    pushClaim(claims, person, {
      surface: 'core.quotes',
      fieldPath: `People.quotes[${idx}]`,
      objectType: 'quote',
      objectLabel: record.source || null,
      claimType: 'quote',
      priority: 'high',
      claimText: `${person.name} 的代表语录：“${compact(record.text, 260)}” 来源：${record.source || 'unknown'}${record.year ? ` ${record.year}` : ''}`,
      verificationQuestion: '这句语录是否确实由该人物说出或写出，来源和年份是否正确？转述、误引或无来源应标记 needs_source 或 unsupported。',
      value: record,
      sourceHints: [{ url: record.url, label: record.source || 'quote source' }],
    });
  }

  for (const [idx, education] of asArray(person.education).entries()) {
    const record = asRecord(education);
    pushClaim(claims, person, {
      surface: 'profile.education',
      fieldPath: `People.education[${idx}]`,
      objectType: 'education',
      objectLabel: record.school || null,
      claimType: 'education',
      priority: 'medium',
      claimText: `${person.name} 的教育经历：${record.school || ''}${record.degree ? `，${record.degree}` : ''}${record.field ? `，${record.field}` : ''}${record.year ? `，${record.year}` : ''}${record.advisor ? `，导师 ${record.advisor}` : ''}`,
      verificationQuestion: '这条教育经历是否属于该人物本人，学校、学位、领域、年份和导师是否正确？',
      value: record,
      sourceHints: person.sourceWhitelist?.map((url) => ({ url, label: 'sourceWhitelist' })),
    });
  }
}

function addCardClaims(claims, peopleById, cardsByPerson) {
  for (const [personId, cards] of cardsByPerson.entries()) {
    const person = peopleById.get(personId);
    if (!person) continue;
    for (const [idx, card] of cards.entries()) {
      pushClaim(claims, person, {
        surface: 'featured.cards',
        fieldPath: `Card[${card.id}]`,
        objectType: 'card',
        objectId: card.id,
        objectLabel: card.title,
        claimType: 'learning_card',
        priority: idx < 10 ? 'high' : 'medium',
        claimText: `${person.name} 的学习卡片《${card.title}》：${compact(card.content, 380)}${card.tags?.length ? ` 标签：${card.tags.join(', ')}` : ''}`,
        verificationQuestion: '这张学习卡片的内容是否属于该人物且事实正确？是否存在把公司/领域/其他人的观点误写成该人物贡献的问题？',
        value: card,
        sourceHints: [{ url: card.sourceUrl, label: 'card source' }],
      });
    }
  }
}

function addRoleClaims(claims, peopleById, rolesByPerson) {
  for (const [personId, roles] of rolesByPerson.entries()) {
    const person = peopleById.get(personId);
    if (!person) continue;
    for (const role of roles) {
      const org = role.orgNameZh || role.orgName;
      const dateRange = [role.startDate ? String(role.startDate).slice(0, 10) : null, role.endDate ? String(role.endDate).slice(0, 10) : 'now'].filter(Boolean).join(' - ');
      pushClaim(claims, person, {
        surface: 'profile.timeline',
        fieldPath: `PersonRole[${role.id}]`,
        objectType: 'role',
        objectId: role.id,
        objectLabel: `${role.roleZh || role.role} @ ${org}`,
        claimType: 'career_role',
        priority: role.endDate ? 'medium' : 'high',
        claimText: `${person.name} 的履历：${role.roleZh || role.role} @ ${org}${dateRange ? `，${dateRange}` : ''}`,
        verificationQuestion: '这条履历是否属于该人物，职位、机构、开始/结束时间和当前状态是否正确？如果职位仍被展示为当前但实际已离任，应标记 stale。',
        value: role,
        sourceHints: role.source ? [{ label: `role source: ${role.source}` }] : [],
      });
    }
  }
}

function addRelationClaims(claims, peopleById, relations) {
  for (const rel of relations) {
    const person = peopleById.get(rel.personId);
    const relatedPerson = peopleById.get(rel.relatedPersonId);
    if (!person || !relatedPerson) continue;

    pushClaim(claims, person, {
      surface: 'relations',
      fieldPath: `PersonRelation[${rel.id}]`,
      objectType: 'relation',
      objectId: rel.id,
      objectLabel: `${relatedPerson.name} / ${rel.relationType}`,
      claimType: 'person_relation',
      priority: rel.reviewStatus === 'trusted' || rel.reviewStatus === 'confirmed' ? 'medium' : 'high',
      claimText: `${relatedPerson.name} 是 ${person.name} 的 ${rel.relationType}${rel.description ? `。说明：${compact(rel.description, 220)}` : ''}`,
      verificationQuestion: '这条人物关系是否真实，方向是否正确，关系类型是否准确？导师/学生、前任/继任者这类方向尤其要核对。',
      value: rel,
      sourceHints: [
        { url: rel.evidenceUrl, label: rel.evidenceNote || 'relation evidence' },
        rel.source ? { label: `relation source: ${rel.source}` } : null,
      ],
    });

    const reverseType = REVERSE_RELATION_TYPE[rel.relationType] || rel.relationType;
    pushClaim(claims, relatedPerson, {
      surface: 'relations.reverseDisplay',
      fieldPath: `PersonRelation[${rel.id}]-reverse`,
      objectType: 'relation',
      objectId: `${rel.id}-reverse`,
      objectLabel: `${person.name} / ${reverseType}`,
      claimType: 'person_relation_display',
      priority: rel.reviewStatus === 'trusted' || rel.reviewStatus === 'confirmed' ? 'medium' : 'high',
      claimText: `${person.name} 在 ${relatedPerson.name} 页面展示为 ${reverseType}`,
      verificationQuestion: '这条反向展示关系是否由原始关系正确转换，方向和中文标签是否符合用户从当前人物页面看到的含义？',
      value: { ...rel, displayPersonId: relatedPerson.id, displayRelatedPersonId: person.id, displayRelationType: reverseType },
      sourceHints: [
        { url: rel.evidenceUrl, label: rel.evidenceNote || 'relation evidence' },
        rel.source ? { label: `relation source: ${rel.source}` } : null,
      ],
    });
  }
}

function addRawPoolClaims(claims, peopleById, rawItemsByPerson) {
  for (const [personId, items] of rawItemsByPerson.entries()) {
    const person = peopleById.get(personId);
    if (!person) continue;
    for (const item of items) {
      const sourceType = item.sourceType;
      const displayLimit = SOURCE_DISPLAY_LIMITS[sourceType] || null;
      const surface = SOURCE_SURFACE[sourceType] || 'rawPool';
      const inDisplayWindow = displayLimit ? item.sourceRank <= displayLimit : false;
      pushClaim(claims, person, {
        surface,
        fieldPath: `RawPoolItem[${item.id}]`,
        objectType: 'rawPoolItem',
        objectId: item.id,
        objectLabel: item.title,
        claimType: 'source_item_belongs_to_person',
        priority: inDisplayWindow ? 'high' : 'low',
        claimText: `${sourceType} 内容《${item.title}》被挂在 ${person.name} 名下。摘要：${compact(item.text, 360)}`,
        verificationQuestion: '这条外部内容是否确实关于/来自该人物，并适合出现在该人物页面对应栏目？论文需要核作者，视频需要核本人/访谈/相关分析分类，博客/开源/播客需要核归属。',
        value: {
          ...item,
          displayedOnPersonPage: inDisplayWindow,
          sourceDisplayRank: item.sourceRank,
          sourceDisplayLimit: displayLimit,
        },
        sourceHints: [{ url: item.url, label: sourceType }],
      });
    }
  }
}

function addCourseClaims(claims, peopleById, coursesByPerson) {
  for (const [personId, courses] of coursesByPerson.entries()) {
    const person = peopleById.get(personId);
    if (!person) continue;
    for (const course of courses) {
      pushClaim(claims, person, {
        surface: 'courses',
        fieldPath: `Course[${course.id}]`,
        objectType: 'course',
        objectId: course.id,
        objectLabel: course.titleZh || course.title,
        claimType: 'course',
        priority: course.verified ? 'medium' : 'high',
        claimText: `${course.titleZh || course.title} 被展示为 ${person.name} 的课程。平台：${course.platform}。${course.description ? `说明：${compact(course.description, 260)}` : ''}`,
        verificationQuestion: '这门课是否确实由该人物主讲、创建或深度参与？平台、标题、付费类型、难度、学员数、评分、先修条件和话题标签是否准确？',
        value: course,
        sourceHints: [{ url: course.url, label: 'course url' }],
      });
    }
  }
}

function groupBy(rows, key) {
  const map = new Map();
  for (const row of rows) {
    const value = key(row);
    if (!map.has(value)) map.set(value, []);
    map.get(value).push(row);
  }
  return map;
}

async function loadRows() {
  const people = await sql`
    SELECT id, qid, name, aliases, description, "whyImportant", status,
           occupation, organization, "officialLinks", "sourceWhitelist",
           topics, "topicRanks", "topicDetails", quotes, education, products,
           "currentTitle", "roleCategory", "influenceScore"
    FROM "People"
    WHERE (${!PERSON_ID_FILTER} OR id = ${PERSON_ID_FILTER || ''})
      AND (${!PERSON_FILTER} OR name ILIKE ${PERSON_FILTER || ''})
      AND (${!STATUS_FILTER} OR status = ${STATUS_FILTER || ''})
    ORDER BY "influenceScore" DESC, name ASC
  `;

  const personIds = people.map((person) => person.id);
  if (!personIds.length) {
    return { people, cards: [], roles: [], relations: [], rawItems: [], courses: [] };
  }

  const [cards, roles, relations, reverseRelations, rawItems, courses] = await Promise.all([
    sql`
      SELECT id, "personId", type, title, content, tags, "sourceUrl", importance
      FROM "Card"
      WHERE "personId" = ANY(${personIds})
        AND "isActive" = true
      ORDER BY "personId", importance DESC, "createdAt" DESC
    `,
    sql`
      SELECT r.id, r."personId", r.role, r."roleZh", r."startDate", r."endDate",
             r.source, r.confidence, r."advisorId",
             o.name AS "orgName", o."nameZh" AS "orgNameZh", o.type AS "orgType",
             advisor.name AS "advisorName"
      FROM "PersonRole" r
      JOIN "Organization" o ON o.id = r."organizationId"
      LEFT JOIN "People" advisor ON advisor.id = r."advisorId"
      WHERE r."personId" = ANY(${personIds})
      ORDER BY r."personId", r."startDate" DESC NULLS LAST
    `,
    sql`
      SELECT rel.id, rel."personId", rel."relatedPersonId", rel."relationType",
             rel.description, rel.source, rel.confidence, rel."reviewStatus",
             rel."evidenceUrl", rel."evidenceNote"
      FROM "PersonRelation" rel
      WHERE rel."personId" = ANY(${personIds})
      ORDER BY rel."personId", rel."relationType"
    `,
    sql`
      SELECT rel.id, rel."personId", rel."relatedPersonId", rel."relationType",
             rel.description, rel.source, rel.confidence, rel."reviewStatus",
             rel."evidenceUrl", rel."evidenceNote"
      FROM "PersonRelation" rel
      WHERE rel."relatedPersonId" = ANY(${personIds})
      ORDER BY rel."relatedPersonId", rel."relationType"
    `,
    sql`
      SELECT id, "personId", "sourceType", url, title, text, "publishedAt",
             metadata, "fetchStatus", processed, "fetchedAt",
             ROW_NUMBER() OVER (
               PARTITION BY "personId", "sourceType"
               ORDER BY "publishedAt" DESC NULLS LAST, "fetchedAt" DESC, title ASC
             )::int AS "sourceRank"
      FROM "RawPoolItem"
      WHERE "personId" = ANY(${personIds})
      ORDER BY "personId", "sourceType", "sourceRank"
    `,
    sql`
      SELECT id, "personId", title, "titleZh", platform, url, type, level, category,
             description, "thumbnailUrl", duration, language, enrollments, rating,
             "reviewCount", prerequisite, "learningOrder", topics, source, verified,
             confidence, "publishedAt", "lastUpdatedAt"
      FROM "Course"
      WHERE "personId" = ANY(${personIds})
      ORDER BY "personId", "learningOrder" ASC NULLS LAST, enrollments DESC NULLS LAST
    `,
  ]);

  const relationById = new Map(relations.map((rel) => [rel.id, rel]));
  for (const rel of reverseRelations) {
    if (!relationById.has(rel.id)) relationById.set(rel.id, rel);
  }

  return {
    people,
    cards,
    roles,
    relations: [...relationById.values()],
    rawItems,
    courses,
  };
}

function summarize(claims, people) {
  const byClaimType = {};
  const byPriority = {};
  const bySurface = {};
  const byPerson = new Map();

  for (const claim of claims) {
    byClaimType[claim.claimType] = (byClaimType[claim.claimType] || 0) + 1;
    byPriority[claim.priority] = (byPriority[claim.priority] || 0) + 1;
    bySurface[claim.surface] = (bySurface[claim.surface] || 0) + 1;
    const personSummary = byPerson.get(claim.personId) || {
      personId: claim.personId,
      person: claim.person,
      status: claim.status,
      total: 0,
      high: 0,
      medium: 0,
      low: 0,
      claimTypes: {},
    };
    personSummary.total += 1;
    personSummary[claim.priority] += 1;
    personSummary.claimTypes[claim.claimType] = (personSummary.claimTypes[claim.claimType] || 0) + 1;
    byPerson.set(claim.personId, personSummary);
  }

  return {
    generatedAt: new Date().toISOString(),
    filters: {
      person: PERSON_FILTER || null,
      personId: PERSON_ID_FILTER || null,
      status: STATUS_FILTER || null,
      claimType: CLAIM_TYPE_FILTER || null,
    },
    people: people.length,
    claims: claims.length,
    byClaimType,
    byPriority,
    bySurface,
    topPeopleByHighPriorityClaims: [...byPerson.values()]
      .sort((a, b) => b.high - a.high || b.total - a.total || a.person.localeCompare(b.person))
      .slice(0, 40),
  };
}

async function main() {
  const rows = await loadRows();
  const claims = [];
  const peopleById = new Map(rows.people.map((person) => [person.id, person]));

  for (const person of rows.people) {
    addPeopleFieldClaims(claims, person);
    addStructuredJsonClaims(claims, person);
  }

  addCardClaims(claims, peopleById, groupBy(rows.cards, (row) => row.personId));
  addRoleClaims(claims, peopleById, groupBy(rows.roles, (row) => row.personId));
  addRelationClaims(claims, peopleById, rows.relations);
  addRawPoolClaims(claims, peopleById, groupBy(rows.rawItems, (row) => row.personId));
  addCourseClaims(claims, peopleById, groupBy(rows.courses, (row) => row.personId));

  claims.sort((a, b) => (
    a.person.localeCompare(b.person)
    || a.priority.localeCompare(b.priority)
    || a.surface.localeCompare(b.surface)
    || a.fieldPath.localeCompare(b.fieldPath)
  ));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${claims.map((claim) => JSON.stringify(claim)).join('\n')}\n`);

  const summary = summarize(claims, rows.people);
  fs.writeFileSync(SUMMARY_OUT, `${JSON.stringify(summary, null, 2)}\n`);

  console.log(JSON.stringify({
    out: OUT,
    summaryOut: SUMMARY_OUT,
    people: summary.people,
    claims: summary.claims,
    byClaimType: summary.byClaimType,
    byPriority: summary.byPriority,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
