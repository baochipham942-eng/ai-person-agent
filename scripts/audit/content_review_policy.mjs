import fs from 'node:fs';
import path from 'node:path';

export const POLICY_PATH = 'docs/audit-2026-06/CONTENT_REVIEW_POLICY.json';

export function loadContentReviewPolicy(root = process.cwd()) {
  return JSON.parse(fs.readFileSync(path.join(root, POLICY_PATH), 'utf8'));
}

export function collectCandidateReadinessBlockers(row, policy = loadContentReviewPolicy(), options = {}) {
  const criteria = policy.candidateReadiness;
  const blockers = [];
  if (row.status && row.status !== 'candidate') blockers.push(`status_${row.status}`);
  if (Number(row.completeness || 0) < criteria.completenessMin) {
    blockers.push(`completeness_below_${criteria.completenessMin}`);
  }
  if (Number(row.rawCount || 0) < criteria.rawCountMin) blockers.push(`raw_count_below_${criteria.rawCountMin}`);
  if (Number(row.keepCount || 0) < criteria.keepCountMin) blockers.push(`qa_keep_below_${criteria.keepCountMin}`);
  if (Number(row.liveCount || 0) < criteria.liveCountMin) blockers.push('live_source_missing');
  if (Number(row.cardCount || 0) < criteria.cardCountMin) blockers.push(`card_count_below_${criteria.cardCountMin}`);
  if ((options.includeAvatarBlocker ?? true) && criteria.avatarRequiredForPromotion && 'avatarUrl' in row && !row.avatarUrl) {
    blockers.push('avatar_missing');
  }
  return blockers;
}

export function candidateReadinessCriteria(policy = loadContentReviewPolicy()) {
  const criteria = policy.candidateReadiness;
  return {
    status: 'candidate',
    completeness: `>= ${criteria.completenessMin}`,
    rawCount: `>= ${criteria.rawCountMin}`,
    keepCount: `>= ${criteria.keepCountMin}`,
    liveCount: `>= ${criteria.liveCountMin}`,
    cardCount: `>= ${criteria.cardCountMin}`,
    avatarUrl: criteria.avatarRequiredForPromotion ? 'required for promotion' : 'tracked separately',
  };
}

export function isWeakStandaloneLink(link, policy = loadContentReviewPolicy()) {
  const type = String(link?.type || '').toLowerCase();
  const url = String(link?.url || '').toLowerCase();
  if (policy.candidateIntake.weakStandaloneLinkTypes.includes(type)) return true;
  return policy.candidateIntake.weakStandaloneDomains.some((domain) => url.includes(domain));
}

export function isStrongCandidateLink(link, policy = loadContentReviewPolicy()) {
  const url = String(link?.url || '');
  if (!/^https?:\/\//i.test(url)) return false;
  if (isWeakStandaloneLink(link, policy)) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
    if (host.endsWith('google.com') || host.endsWith('bing.com') || host.endsWith('baidu.com')) return false;
    if (/\/search\b|[?&](q|query)=/i.test(`${parsed.pathname}${parsed.search}`)) return false;
    return true;
  } catch {
    return false;
  }
}
