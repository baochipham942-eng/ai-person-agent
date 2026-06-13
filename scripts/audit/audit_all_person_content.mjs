/**
 * Full person-content review.
 *
 * Read-only. Aggregates People, Cards, products, topics, roles, relations, and
 * raw-pool signals into one review queue for product and data decisions.
 *
 * Usage:
 *   node scripts/audit/audit_all_person_content.mjs
 *   node scripts/audit/audit_all_person_content.mjs --out=docs/audit-2026-06/data/full_person_content_review.json
 */
import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { neon } from '@neondatabase/serverless';

const OUT = process.argv.find((arg) => arg.startsWith('--out='))?.slice('--out='.length)
  || 'docs/audit-2026-06/data/full_person_content_review.json';

if (!process.env.DATABASE_URL) {
  throw new Error('Missing DATABASE_URL');
}

const sql = neon(process.env.DATABASE_URL);
const CURRENT_YEAR = 2026;

const OLD_COPY_RE = /代表产品|candidate\s*状态|代表线索|当前处于\s*candidate/i;
const PLACEHOLDER_RE = /\b(TODO|TBD|N\/A|unknown|null)\b|待补充|暂无|未找到|不详|未知/iu;
const INFERRED_RE = /inferred|推断|疑似|可能|reportedly|according to reports/i;
const POLLUTION_RE = /coupon|porsche|优惠券|折扣码|健身|小说|彩票|博彩|成人|casino|loan|payday/i;
const POSITION_ORG_RE = /\b(founder|co-?founder|ceo|cto|chief|president|director|professor|researcher|scientist|engineer|leader|architect|fellow|student|employee|advisor)\b/i;

const PRODUCT_VERSION_RE = /\b(gpt-?3|gpt-?4|gpt-?4o|claude\s+[0-9]|sonnet|opus|haiku|o1|o3|o4|gemini\s+[0-9]|mixtral|deepseek-v[0-9]|llama\s*[0-9]|pytorch\s*[0-9]|mimo-v[0-9])/i;
const API_CHANNEL_RE = /\b(api|sdk)\b|openai service|coding plan|\bmaas\b/i;
const RESEARCH_ARTIFACT_RE = /constitutional ai|rlhf|backpropagation|transformer architecture|scaling laws|mmlu|squad|imagenet|caltech-101|dropout|pagerank|benchmark|dataset|paper|method/i;
const REPO_SIGNAL_RE = /github\.com|gitlab\.com|stars|forks|repository|repo/i;
const TOPIC_ALIASES = {
  ai安全: ['安全', 'aisafety'],
  安全: ['ai安全', 'aisafety'],
  agent: ['智能体', 'agenticai'],
  智能体: ['agent', 'agenticai'],
  大语言模型: ['llm', 'largelanguagemodels', '语言模型'],
  多模态: ['multimodal', '多模态ai'],
};

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function asRecord(value) {
  return isRecord(value) ? value : {};
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\b(inc|inc\.|corp|corp\.|corporation|company|limited|ltd|llc|com)\b/g, '')
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '');
}

const ORG_ALIASES = {
  amazon: ['amazoncom'],
  anthropic: ['anthropicpbc'],
  apple: ['苹果', '苹果公司'],
  cloudflare: ['cloudflareinc'],
  cornelluniversity: ['康奈尔大学'],
  deeplearningai: ['deeplearning.ai', 'deeplearning'],
  dukeuniversity: ['杜克大学'],
  fair: ['facebook人工智能研究院', 'facebookai', 'metai'],
  facebookairesearch: ['facebook人工智能研究院', 'fair', 'metai'],
  googledeepmind: ['deepmind', '谷歌deepmind', '谷歌大脑', 'googlebrain'],
  massachusettsinstituteoftechnologymit: ['mit', '麻省理工学院'],
  massachusettsinstituteoftechnology: ['mit', '麻省理工学院'],
  mcgilluniversity: ['麦吉尔大学'],
  metai: ['meta', 'facebookai', 'facebook人工智能研究院'],
  microsoft: ['微软', '微软研究院', 'microsoftresearch'],
  microsoftai: ['微软ai', 'microsoft'],
  mistralai: ['mistral'],
  newyorkuniversity: ['nyu', '纽约大学'],
  nyu: ['newyorkuniversity', '纽约大学'],
  google: ['谷歌', 'googleresearch', 'googlebrain', '谷歌大脑', '谷歌研究院'],
  openai: ['openaiinc'],
  nvidia: ['英伟达'],
  safesuperintelligenceinc: ['safesuperintelligence', '安全超级智能公司', 'ssi'],
  stanforduniversity: ['stanford', '斯坦福大学'],
  thewhartonschool: ['whartonschool', '沃顿商学院'],
  thinkingmachineslab: ['思维机器实验室'],
  tsinghuauniversity: ['清华大学', '清华大学nlp'],
  ucberkeley: ['universityofcaliforniaberkeley', 'berkeley', '加州大学伯克利分校'],
  universityofcaliforniaberkeley: ['ucberkeley', 'berkeley', '加州大学伯克利分校'],
  universityofedinburgh: ['爱丁堡大学'],
  universityofoxford: ['牛津大学'],
  universityoftoronto: ['多伦多大学', 'uoft', 'utoronto'],
  zhipuai: ['智谱ai', '智谱'],
  xai: ['xai'],
};

function orgVariants(value) {
  const normalized = normalize(value);
  const variants = new Set([normalized]);
  for (const [canonical, aliases] of Object.entries(ORG_ALIASES)) {
    if (canonical === normalized || aliases.includes(normalized)) {
      variants.add(canonical);
      aliases.forEach((alias) => variants.add(alias));
    }
  }
  return variants;
}

function isAliasMatch(left, right) {
  const leftVariants = orgVariants(left);
  const rightVariants = orgVariants(right);
  if (!leftVariants.size || !rightVariants.size) return false;

  for (const a of leftVariants) {
    if (!a) continue;
    for (const b of rightVariants) {
      if (!b) continue;
      if (a === b || a.includes(b) || b.includes(a)) return true;
    }
  }
  return false;
}

function splitOrganizationValues(values) {
  return values
    .flatMap((value) => String(value || '').split(/[、，;；/]+/g))
    .map((value) => value.trim())
    .filter(Boolean);
}

function topicKey(value) {
  return normalize(value);
}

function topicVariants(value) {
  const normalized = topicKey(value);
  const variants = new Set([normalized]);
  for (const [canonical, aliases] of Object.entries(TOPIC_ALIASES)) {
    const canon = topicKey(canonical);
    const aliasKeys = aliases.map(topicKey);
    if (canon === normalized || aliasKeys.includes(normalized)) {
      variants.add(canon);
      aliasKeys.forEach((alias) => variants.add(alias));
    }
  }
  return variants;
}

function findTopicMatch(topic, topics) {
  const variants = topicVariants(topic);
  return topics.find((candidate) => {
    const candidateVariants = topicVariants(candidate);
    for (const variant of variants) {
      if (candidateVariants.has(variant)) return true;
    }
    return false;
  }) || null;
}

function extractTitleOrg(currentTitle) {
  const text = String(currentTitle || '');
  const match = text.match(/@\s*([^|,;()]+(?:\([^)]*\))?)/);
  return match?.[1]?.trim() || null;
}

function compactText(...values) {
  return values.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

function yearValue(value) {
  if (value instanceof Date) return value.getUTCFullYear();
  if (typeof value === 'string') {
    const year = Number(value.slice(0, 4));
    return Number.isFinite(year) ? year : null;
  }
  return null;
}

function summarize(items, key) {
  return items.reduce((acc, item) => {
    const value = key(item);
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function topPeople(issues, limit = 30) {
  const byPerson = new Map();
  for (const issue of issues) {
    const existing = byPerson.get(issue.personId) || {
      personId: issue.personId,
      person: issue.person,
      status: issue.status,
      total: 0,
      high: 0,
      medium: 0,
      low: 0,
      codes: {},
    };
    existing.total += 1;
    existing[issue.severity] = (existing[issue.severity] || 0) + 1;
    existing.codes[issue.code] = (existing.codes[issue.code] || 0) + 1;
    byPerson.set(issue.personId, existing);
  }
  return [...byPerson.values()]
    .sort((a, b) => b.high - a.high || b.medium - a.medium || b.total - a.total || a.person.localeCompare(b.person))
    .slice(0, limit);
}

function makeIssue(person, input) {
  return {
    severity: input.severity,
    lane: input.lane,
    decision: input.decision,
    code: input.code,
    personId: person.id,
    person: person.name,
    status: person.status,
    objectType: input.objectType,
    objectId: input.objectId || null,
    objectLabel: input.objectLabel || null,
    evidence: input.evidence,
    recommendation: input.recommendation,
  };
}

async function loadRows() {
  const [people, cards, roles, relations, rawStats, rawMatches] = await Promise.all([
    sql`
      SELECT id, name, status, "currentTitle", organization, occupation, "roleCategory",
             topics, "topicRanks", "topicDetails", products, "whyImportant",
             description, "avatarUrl", "influenceScore", "officialLinks", quotes
      FROM "People"
      ORDER BY "influenceScore" DESC, name ASC
    `,
    sql`
      SELECT id, "personId", type, title, content, tags, "sourceUrl", importance
      FROM "Card"
      WHERE "isActive" = true
      ORDER BY "personId", importance DESC, title ASC
    `,
    sql`
      SELECT r.id, r."personId", r.role, r."roleZh", r."startDate", r."endDate",
             r.source, r.confidence,
             o.name AS "orgName", o."nameZh" AS "orgNameZh", o.type AS "orgType"
      FROM "PersonRole" r
      JOIN "Organization" o ON o.id = r."organizationId"
      ORDER BY r."personId", r."startDate" NULLS LAST
    `,
    sql`
      SELECT rel.id, rel."personId", rel."relatedPersonId", rel."relationType",
             rel.description, rel.source, rel.confidence, rel."reviewStatus",
             rel."evidenceUrl", rel."evidenceNote", p2.name AS "relatedName"
      FROM "PersonRelation" rel
      JOIN "People" p2 ON p2.id = rel."relatedPersonId"
      ORDER BY rel."personId", rel."relationType"
    `,
    sql`
      SELECT "personId",
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE "fetchStatus" <> 'success')::int AS failed,
             COUNT(*) FILTER (WHERE processed = false)::int AS unprocessed
      FROM "RawPoolItem"
      GROUP BY "personId"
    `,
    sql`
      SELECT id, "personId", "sourceType", url, title, LEFT(text, 500) AS text
      FROM "RawPoolItem"
      WHERE title ~* ${POLLUTION_RE.source}
         OR text ~* ${POLLUTION_RE.source}
      ORDER BY "personId", "fetchedAt" DESC
      LIMIT 500
    `,
  ]);

  return { people, cards, roles, relations, rawStats, rawMatches };
}

function indexByPerson(rows) {
  const map = new Map();
  for (const row of rows) {
    const personId = row.personId;
    if (!map.has(personId)) map.set(personId, []);
    map.get(personId).push(row);
  }
  return map;
}

function reviewPerson(person, context) {
  const issues = [];
  const cards = context.cardsByPerson.get(person.id) || [];
  const roles = context.rolesByPerson.get(person.id) || [];
  const relations = context.relationsByPerson.get(person.id) || [];
  const rawMatches = context.rawMatchesByPerson.get(person.id) || [];
  const rawStats = context.rawStatsByPerson.get(person.id);
  const products = asArray(person.products);
  const topics = asArray(person.topics).map(String);
  const topicDetails = asArray(person.topicDetails);
  const topicRanks = asRecord(person.topicRanks);
  const orgs = splitOrganizationValues(asArray(person.organization));
  const officialLinks = asArray(person.officialLinks);

  const personText = compactText(person.name, person.description, person.whyImportant, person.currentTitle);
  if (OLD_COPY_RE.test(personText)) {
    issues.push(makeIssue(person, {
      severity: 'high',
      lane: 'copy',
      decision: 'auto_fix_safe',
      code: 'old_product_or_candidate_copy_in_profile',
      objectType: 'people',
      evidence: personText.match(OLD_COPY_RE)?.[0] || 'old copy',
      recommendation: 'Replace legacy product/candidate wording with representative-achievement language.',
    }));
  }

  if (!person.whyImportant || String(person.whyImportant).trim().length < 30) {
    issues.push(makeIssue(person, {
      severity: Number(person.influenceScore || 0) >= 8 ? 'medium' : 'low',
      lane: 'profile',
      decision: 'model_review',
      code: 'missing_or_thin_why_important',
      objectType: 'people',
      evidence: person.whyImportant || null,
      recommendation: 'Regenerate whyImportant with source names and concrete contribution.',
    }));
  }

  if (!person.avatarUrl && Number(person.influenceScore || 0) >= 8) {
    issues.push(makeIssue(person, {
      severity: 'medium',
      lane: 'avatar',
      decision: 'manual_review',
      code: 'high_influence_missing_avatar',
      objectType: 'people',
      evidence: `influenceScore=${person.influenceScore}`,
      recommendation: 'Fetch or assign a reliable avatar before treating the profile as polished.',
    }));
  }

  if (person.currentTitle && INFERRED_RE.test(person.currentTitle)) {
    issues.push(makeIssue(person, {
      severity: 'high',
      lane: 'career',
      decision: 'manual_review',
      code: 'current_title_contains_inference_marker',
      objectType: 'people',
      evidence: person.currentTitle,
      recommendation: 'Replace speculative title wording with source-backed title or remove the title.',
    }));
  }

  const titleOrg = extractTitleOrg(person.currentTitle);
  if (titleOrg && orgs.length > 0 && !orgs.some((org) => isAliasMatch(titleOrg, org))) {
    issues.push(makeIssue(person, {
      severity: 'medium',
      lane: 'career',
      decision: 'product_decision',
      code: 'current_title_org_not_in_people_orgs',
      objectType: 'people',
      evidence: { currentTitle: person.currentTitle, extractedOrg: titleOrg, knownOrganizations: orgs },
      recommendation: 'Decide whether to add the title org to People.organization or correct the currentTitle.',
    }));
  }

  for (const product of products) {
    const productText = compactText(product.name, product.category, product.type, product.description, product.url);
    if (OLD_COPY_RE.test(productText)) {
      issues.push(makeIssue(person, {
        severity: 'high',
        lane: 'product',
        decision: 'auto_fix_safe',
        code: 'old_copy_in_product_row',
        objectType: 'product',
        objectLabel: product.name || null,
        evidence: productText.match(OLD_COPY_RE)?.[0] || productText,
        recommendation: 'Remove legacy product/candidate wording from the representative-achievement row.',
      }));
    }

    if (API_CHANNEL_RE.test(productText)) {
      issues.push(makeIssue(person, {
        severity: 'medium',
        lane: 'product',
        decision: 'product_decision',
        code: 'product_row_is_api_or_sdk_channel',
        objectType: 'product',
        objectLabel: product.name || null,
        evidence: product,
        recommendation: 'Usually fold API/SDK rows into the parent product or platform unless the person owns that developer product.',
      }));
    } else if (PRODUCT_VERSION_RE.test(productText)) {
      issues.push(makeIssue(person, {
        severity: 'medium',
        lane: 'product',
        decision: 'product_decision',
        code: 'product_row_is_specific_model_version',
        objectType: 'product',
        objectLabel: product.name || null,
        evidence: product,
        recommendation: 'Prefer canonical model family/platform unless the exact release is source-backed as this person’s core achievement.',
      }));
    } else if (REPO_SIGNAL_RE.test(productText)) {
      issues.push(makeIssue(person, {
        severity: 'low',
        lane: 'product',
        decision: 'product_decision',
        code: 'product_row_may_belong_to_open_source_tab',
        objectType: 'product',
        objectLabel: product.name || null,
        evidence: product,
        recommendation: 'Review whether the row should be shown under open-source/projects instead of representative achievements.',
      }));
    } else if (RESEARCH_ARTIFACT_RE.test(productText) && /product|platform/i.test(String(product.category || product.type || ''))) {
      issues.push(makeIssue(person, {
        severity: 'low',
        lane: 'product',
        decision: 'manual_review',
        code: 'research_artifact_labeled_as_product',
        objectType: 'product',
        objectLabel: product.name || null,
        evidence: product,
        recommendation: 'Keep as representative achievement if sourced, but normalize the category away from product/platform wording.',
      }));
    }
  }

  const openSourceSignals = products.some((p) => REPO_SIGNAL_RE.test(compactText(p.name, p.description, p.url, p.type, p.category)))
    || officialLinks.some((link) => /github|gitlab/i.test(compactText(link.type, link.url, link.handle)))
    || cards.some((card) => /github|开源|open source/i.test(compactText(card.title, card.content, card.sourceUrl, ...(card.tags || []))));
  if (topics.includes('开源') && !openSourceSignals) {
    issues.push(makeIssue(person, {
      severity: 'medium',
      lane: 'topic',
      decision: 'product_decision',
      code: 'opensource_topic_without_visible_signal',
      objectType: 'topics',
      evidence: { topics, products: products.map((p) => p.name), officialLinks },
      recommendation: 'Remove the 开源 topic or add source-backed open-source evidence.',
    }));
  }

  const detailTopics = topicDetails.map((detail) => String(detail?.topic || '')).filter(Boolean);
  const rankTopics = Object.keys(topicRanks);
  for (const topic of detailTopics) {
    const matchedTopic = findTopicMatch(topic, topics);
    if (!matchedTopic) {
      issues.push(makeIssue(person, {
        severity: 'low',
        lane: 'topic',
        decision: 'product_decision',
        code: 'topic_detail_not_in_topics',
        objectType: 'topicDetails',
        objectLabel: topic,
        evidence: { topics, detailTopics },
        recommendation: 'Decide whether to add this topic to topics or remove the stale topicDetails entry.',
      }));
    } else if (matchedTopic !== topic) {
      issues.push(makeIssue(person, {
        severity: 'low',
        lane: 'topic',
        decision: 'auto_fix_safe',
        code: 'topic_detail_alias_mismatch',
        objectType: 'topicDetails',
        objectLabel: topic,
        evidence: { topics, detailTopic: topic, matchedTopic },
        recommendation: 'Rename topicDetails.topic to the canonical topic already present in topics.',
      }));
    }
  }
  for (const topic of rankTopics) {
    const matchedTopic = findTopicMatch(topic, topics);
    if (!matchedTopic) {
      issues.push(makeIssue(person, {
        severity: 'low',
        lane: 'topic',
        decision: 'auto_fix_safe',
        code: 'topic_rank_not_in_topics',
        objectType: 'topicRanks',
        objectLabel: topic,
        evidence: { topics, rankTopics },
        recommendation: 'Keep topicRanks keys aligned with topics.',
      }));
    }
  }

  for (const card of cards) {
    const cardText = compactText(card.title, card.content, ...(card.tags || []), card.sourceUrl);
    if (OLD_COPY_RE.test(cardText)) {
      issues.push(makeIssue(person, {
        severity: 'high',
        lane: 'card',
        decision: 'auto_fix_safe',
        code: 'old_product_or_candidate_copy_in_card',
        objectType: 'card',
        objectId: card.id,
        objectLabel: card.title,
        evidence: cardText.match(OLD_COPY_RE)?.[0] || cardText.slice(0, 200),
        recommendation: 'Normalize card wording to representative achievements and remove candidate-status copy.',
      }));
    }
    if (PLACEHOLDER_RE.test(cardText)) {
      issues.push(makeIssue(person, {
        severity: 'medium',
        lane: 'card',
        decision: 'model_review',
        code: 'placeholder_or_unknown_copy_in_card',
        objectType: 'card',
        objectId: card.id,
        objectLabel: card.title,
        evidence: cardText.match(PLACEHOLDER_RE)?.[0] || cardText.slice(0, 200),
        recommendation: 'Regenerate or delete placeholder card content.',
      }));
    }
    if (POLLUTION_RE.test(cardText)) {
      issues.push(makeIssue(person, {
        severity: 'high',
        lane: 'card',
        decision: 'model_review',
        code: 'possible_polluted_card_content',
        objectType: 'card',
        objectId: card.id,
        objectLabel: card.title,
        evidence: cardText.match(POLLUTION_RE)?.[0] || cardText.slice(0, 200),
        recommendation: 'Verify the card belongs to this person before keeping it.',
      }));
    }
  }

  for (const role of roles) {
    const startYear = yearValue(role.startDate);
    const endYear = yearValue(role.endDate);
    if (startYear && endYear && startYear > endYear) {
      issues.push(makeIssue(person, {
        severity: 'high',
        lane: 'career',
        decision: 'auto_fix_safe',
        code: 'role_start_after_end',
        objectType: 'role',
        objectId: role.id,
        objectLabel: `${role.role} @ ${role.orgName}`,
        evidence: { startDate: role.startDate, endDate: role.endDate },
        recommendation: 'Swap or correct role dates after checking source.',
      }));
    }
    if ((startYear && startYear > CURRENT_YEAR + 1) || (endYear && endYear > CURRENT_YEAR + 1)) {
      issues.push(makeIssue(person, {
        severity: 'medium',
        lane: 'career',
        decision: 'manual_review',
        code: 'role_date_in_future',
        objectType: 'role',
        objectId: role.id,
        objectLabel: `${role.role} @ ${role.orgName}`,
        evidence: { startDate: role.startDate, endDate: role.endDate },
        recommendation: 'Correct future-dated role unless it is explicitly scheduled.',
      }));
    }
    if (INFERRED_RE.test(compactText(role.role, role.roleZh, role.orgName))) {
      issues.push(makeIssue(person, {
        severity: 'medium',
        lane: 'career',
        decision: 'manual_review',
        code: 'role_contains_inference_marker',
        objectType: 'role',
        objectId: role.id,
        objectLabel: `${role.role} @ ${role.orgName}`,
        evidence: { role: role.role, roleZh: role.roleZh, org: role.orgName },
        recommendation: 'Replace inferred role with source-backed structured career data.',
      }));
    }
    if (POSITION_ORG_RE.test(role.orgName) && !/university|institute|lab|labs|ai|research|school|college/i.test(role.orgName)) {
      issues.push(makeIssue(person, {
        severity: 'medium',
        lane: 'career',
        decision: 'manual_review',
        code: 'organization_name_looks_like_position',
        objectType: 'role',
        objectId: role.id,
        objectLabel: `${role.role} @ ${role.orgName}`,
        evidence: { orgName: role.orgName, orgType: role.orgType },
        recommendation: 'Move position-like text from Organization.name into PersonRole.role, then reassign/delete bad organization.',
      }));
    }
    if (/^(student|employee|researcher|scientist|engineer)$/i.test(String(role.role || '').trim()) && Number(role.confidence || 0) < 0.9) {
      issues.push(makeIssue(person, {
        severity: 'low',
        lane: 'career',
        decision: 'model_review',
        code: 'generic_low_confidence_role',
        objectType: 'role',
        objectId: role.id,
        objectLabel: `${role.role} @ ${role.orgName}`,
        evidence: { role: role.role, confidence: role.confidence, source: role.source },
        recommendation: 'Upgrade to a specific title with evidence or keep out of prominent career UI.',
      }));
    }
  }

  for (const relation of relations) {
    if (relation.personId === relation.relatedPersonId) {
      issues.push(makeIssue(person, {
        severity: 'high',
        lane: 'relation',
        decision: 'auto_fix_safe',
        code: 'self_relation',
        objectType: 'relation',
        objectId: relation.id,
        objectLabel: `${relation.relationType}: ${person.name}`,
        evidence: relation,
        recommendation: 'Delete self relation.',
      }));
    }
    if (relation.reviewStatus === 'needs_review' && !relation.evidenceUrl && !relation.evidenceNote) {
      issues.push(makeIssue(person, {
        severity: ['advisor', 'cofounder'].includes(relation.relationType) ? 'high' : 'medium',
        lane: 'relation',
        decision: 'manual_review',
        code: 'relation_needs_review_without_evidence',
        objectType: 'relation',
        objectId: relation.id,
        objectLabel: `${relation.relationType}: ${relation.relatedName}`,
        evidence: {
          related: relation.relatedName,
          type: relation.relationType,
          description: relation.description,
          source: relation.source,
          confidence: relation.confidence,
        },
        recommendation: 'Confirm with explicit source evidence or delete from trusted relationship UI.',
      }));
    }
  }

  if (rawStats && rawStats.failed > 0) {
    issues.push(makeIssue(person, {
      severity: 'low',
      lane: 'source',
      decision: 'manual_review',
      code: 'raw_pool_fetch_failures',
      objectType: 'rawPool',
      evidence: rawStats,
      recommendation: 'Refetch failed raw items when refreshing the profile.',
    }));
  }
  if (rawStats && rawStats.total > 0 && rawStats.unprocessed === rawStats.total) {
    issues.push(makeIssue(person, {
      severity: 'low',
      lane: 'source',
      decision: 'manual_review',
      code: 'raw_pool_all_unprocessed',
      objectType: 'rawPool',
      evidence: rawStats,
      recommendation: 'Process or prune raw pool before using it as source confidence.',
    }));
  }
  for (const raw of rawMatches) {
    issues.push(makeIssue(person, {
      severity: 'high',
      lane: 'source',
      decision: 'model_review',
      code: 'possible_polluted_raw_pool_item',
      objectType: 'rawPoolItem',
      objectId: raw.id,
      objectLabel: raw.title,
      evidence: { sourceType: raw.sourceType, title: raw.title, url: raw.url, snippet: raw.text },
      recommendation: 'Verify whether the source item belongs to this person; prune if unrelated.',
    }));
  }

  return issues;
}

async function main() {
  const rows = await loadRows();
  const context = {
    cardsByPerson: indexByPerson(rows.cards),
    rolesByPerson: indexByPerson(rows.roles),
    relationsByPerson: indexByPerson(rows.relations),
    rawStatsByPerson: new Map(rows.rawStats.map((row) => [row.personId, row])),
    rawMatchesByPerson: indexByPerson(rows.rawMatches),
  };

  const issues = rows.people.flatMap((person) => reviewPerson(person, context));
  const autoFixCandidates = issues
    .filter((issue) => issue.decision === 'auto_fix_safe')
    .sort((a, b) => a.lane.localeCompare(b.lane) || a.person.localeCompare(b.person));
  const modelReviewQueue = issues
    .filter((issue) => issue.decision === 'model_review' && ['high', 'medium'].includes(issue.severity))
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'high' ? -1 : 1) || a.person.localeCompare(b.person));
  const productDecisionQueue = issues
    .filter((issue) => issue.decision === 'product_decision')
    .sort((a, b) => a.lane.localeCompare(b.lane) || a.person.localeCompare(b.person));

  const payload = {
    generatedAt: new Date().toISOString(),
    scope: {
      people: rows.people.length,
      cards: rows.cards.length,
      roles: rows.roles.length,
      relations: rows.relations.length,
      rawPoolPeople: rows.rawStats.length,
      rawPollutionMatches: rows.rawMatches.length,
    },
    agentNeoCli: {
      entry: 'CODE_AGENT_DATA_DIR=/tmp/agent-neo-cli node /Users/linchen/Downloads/ai/code-agent/dist/cli/index.cjs',
      requestedProvider: 'xiaomi',
      requestedModel: 'mimo-v2.5-pro',
      currentStatus: 'blocked_by_invalid_xiaomi_api_key_401',
      fallbackUsedHere: 'deterministic_local_audit_only',
    },
    summary: {
      totalIssues: issues.length,
      bySeverity: summarize(issues, (issue) => issue.severity),
      byLane: summarize(issues, (issue) => issue.lane),
      byDecision: summarize(issues, (issue) => issue.decision),
      byCode: summarize(issues, (issue) => issue.code),
      topPeople: topPeople(issues),
    },
    queues: {
      autoFixCandidates,
      modelReviewQueue,
      productDecisionQueue,
    },
    issues,
  };

  const outPath = path.join(process.cwd(), OUT);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);

  console.log(`Full person-content review written: ${OUT}`);
  console.log(JSON.stringify(payload.scope, null, 2));
  console.log(JSON.stringify(payload.summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
