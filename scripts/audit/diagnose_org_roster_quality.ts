import { config as loadEnv } from 'dotenv';
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

import { fetchOrganizationPageData } from '@/lib/entity-pages';
import { resolveCompanyPresentation } from '@/lib/entity-presentations/company-presentation';
import { DIRECTORY_ORGANIZATIONS, getDirectoryOrganizationAliases, type DirectoryPerson } from '@/lib/person-directory-config';

function relevance(p: DirectoryPerson, kws: string[]): number {
  let s = p.influenceScore || 0;
  const m = p.organizationMatch;
  if (m?.isCurrent || m?.status === 'current') s += 30;
  const t = (p.currentTitle || '').toLowerCase();
  const hay = `${t} ${(p.description || '').toLowerCase()}`;
  if (/found|创始|ceo|cto|chief/.test(t)) s += 45;
  else if (/head|lead|director|\bvp\b|principal|负责人|主管/.test(t)) s += 20;
  if (kws.some(k => hay.includes(k))) s += 40;
  return s;
}

// 把 currentTitle 里的 "@ X" 抽出来
function titleOrg(title: string | null): string | null {
  if (!title || !title.includes('@')) return null;
  return title.split('@').pop()!.trim();
}

async function main() {
  for (const org of DIRECTORY_ORGANIZATIONS) {
    const aliases = getDirectoryOrganizationAliases(org).map(a => a.toLowerCase());
    let data;
    try { data = await fetchOrganizationPageData(org); } catch { console.log(`\n## ${org}: [fetch error]`); continue; }
    const pres = resolveCompanyPresentation(data.companyIntelligence.displayName || org, data.companyIntelligence);
    const ranked = [...data.people].sort((a, b) => relevance(b, pres.flagshipKeywords) - relevance(a, pres.flagshipKeywords)).slice(0, 9);

    // 误标现任：在「在职花名册」或「关键人物 current」里，但 currentTitle 的 @公司 不是本公司
    const suspects: string[] = [];
    for (const p of data.currentPeople) {
      const to = titleOrg(p.currentTitle);
      if (to && !aliases.some(a => to.toLowerCase().includes(a) || a.includes(to.toLowerCase()))) {
        suspects.push(`     [在职花名册误标] ${p.name} title="${p.currentTitle}" (履历:${p.role})`);
      }
    }
    for (const p of ranked) {
      const m = p.organizationMatch;
      if (!(m?.isCurrent || m?.status === 'current')) continue;
      const to = titleOrg(p.currentTitle);
      if (to && !aliases.some(a => to.toLowerCase().includes(a) || a.includes(to.toLowerCase()))) {
        suspects.push(`     [关键人物标当前] ${p.name} title="${p.currentTitle}"`);
      }
    }
    const hasContent = data.people.length || data.companyIntelligence.officialArticles.length;
    if (suspects.length || !hasContent) {
      console.log(`\n## ${org}  (people=${data.people.length}, current=${data.currentPeople.length}, alumni=${data.alumniPeople.length}, blogs=${data.companyIntelligence.officialArticles.length})`);
      if (!hasContent) console.log('     [空页面：无人物且无博客]');
      suspects.forEach(s => console.log(s));
    } else {
      process.stdout.write(`. ${org} ok  `);
    }
  }
  console.log('\n--- done ---');
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
