import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { test, before, after } from 'node:test';
import * as cheerio from 'cheerio';

const BASE_URL = process.env.PERSON_UX_BASE_URL || 'http://127.0.0.1:4001';
const SHOULD_START_SERVER = !process.env.PERSON_UX_BASE_URL;

let serverProcess;
let directoryPayload;
let allDirectoryPeople;
let operationsReadiness;

before(async () => {
  if (SHOULD_START_SERVER) {
    const alreadyRunning = await isServerReady();
    if (!alreadyRunning) {
      serverProcess = spawn('npm', ['start'], {
        cwd: process.cwd(),
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env, PORT: '4001' },
      });
      await waitForServer();
    }
  }

  directoryPayload = await fetchJson('/api/person/directory?page=1&limit=12&sortBy=influenceScore');
});

after(() => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
});

test('directory API exposes description and normalized stats', async () => {
  assert.ok(directoryPayload.data.length > 0, 'directory should return people');
  assert.deepEqual(Object.keys(directoryPayload.stats || {}).sort(), [
    'totalOrgs',
    'totalPeople',
    'totalTopics',
  ]);
  assert.equal(typeof directoryPayload.stats.totalPeople, 'number');
  assert.ok('description' in directoryPayload.data[0], 'person item should include description');
});

test('directory avatars are local compressed WebP assets', async () => {
  const people = await fetchAllDirectoryPeople();
  const invalidAvatars = people
    .filter(person => person.avatarUrl)
    .filter(person => !person.avatarUrl.startsWith('/avatars/') || !person.avatarUrl.split('?')[0].endsWith('.webp'));

  assert.equal(invalidAvatars.length, 0, `directory should not expose remote or uncompressed avatars: ${invalidAvatars.map(person => `${person.name}:${person.avatarUrl}`).join(', ')}`);
});

test('avatar-missing candidates stay out of the public directory until promoted', async () => {
  const tameraPayload = await fetchJson('/api/person/directory?search=Tamera&limit=48');
  const names = tameraPayload.data.map(person => person.name);
  assert.ok(!names.includes('Tamera Lanham'), 'avatar-missing candidate should not appear in public directory search');

  const policySource = await readFile('scripts/audit/content_review_policy.mjs', 'utf8');
  const promotionSource = await readFile('scripts/fix/promote_candidate_readiness.ts', 'utf8');
  assert.match(policySource, /avatarRequiredForPromotion/);
  assert.match(policySource, /avatar_missing/);
  assert.match(promotionSource, /includeAvatarBlocker:\s*true/);
});

test('home page SSR renders people, influence copy, and card links without nested anchors', async () => {
  const firstPerson = directoryPayload.data[0];
  const html = await fetchText('/');
  const $ = cheerio.load(html);

  assert.ok(html.includes(firstPerson.name), 'SSR HTML should include the first person name');
  assert.ok(html.includes('综合影响力'), 'sort copy should match influenceScore sort');
  if (directoryPayload.data.some(person => person.weeklyViewCount > 0)) {
    assert.ok(html.includes('本周热度'), 'weekly heat badge should use weekly-view wording');
  }
  assert.ok($('article').length > 0, 'SSR should render directory cards or snapshot fallback');

  const cardSource = await readFile('components/home/ResearcherCard.tsx', 'utf8');
  const directorySource = await readFile('components/home/ResearcherDirectory.tsx', 'utf8');
  assert.match(cardSource, /<article[\s\S]*className="card-interactive/);
  assert.match(cardSource, /onMouseEnter=\{prefetchDetail\}/);
  assert.match(cardSource, /router\.prefetch\(detailHref\)/);
  assert.doesNotMatch(cardSource, /return\s*\(\s*<Link[^>]+className="block group"/);
  assert.match(cardSource, /href=\{buildTopicHref\(topic\)\}/);
  assert.match(cardSource, /href=\{`\/\?view=role&role=/);
  assert.match(cardSource, /进入详情/);
  assert.match(directorySource, /keepPreviousData: true/);
  assert.match(directorySource, /fallbackData:/);
  assert.doesNotMatch(directorySource, /setAllPeople\(\[\]\)/);
  assert.match(directorySource, /flex-wrap items-center justify-between/);
  assert.match(directorySource, /overflow-x-auto/);
});

test('directory exposes productized sorting and entity API contracts', async () => {
  const weeklyPayload = await fetchJson('/api/person/directory?sortBy=weeklyViewCount&limit=3');
  const topicPayload = await fetchJson('/api/topic/Agent');
  const orgPayload = await fetchJson('/api/org/OpenAI');

  assert.equal(weeklyPayload.data.length, 3, 'weeklyViewCount sort should return a page of people');
  assert.ok(weeklyPayload.data.every(person => typeof person.citationCount === 'number'), 'weekly sort should retain citation signal');
  assert.ok(weeklyPayload.data.every(person => typeof person.githubStars === 'number'), 'weekly sort should retain GitHub signal');
  assert.equal(topicPayload.data.topic, 'Agent');
  assert.ok(topicPayload.data.people.length > 0, 'topic API should include top people');
  assert.ok(Array.isArray(topicPayload.data.activity), 'topic API should include activity list');
  assert.ok(Array.isArray(topicPayload.data.works), 'topic API should include works list');
  assert.equal(orgPayload.data.organization, 'OpenAI');
  assert.ok(orgPayload.data.people.length > 0, 'org API should include top people');
  assert.ok(Array.isArray(orgPayload.data.currentPeople), 'org API should include current people');
  assert.ok(Array.isArray(orgPayload.data.alumniPeople), 'org API should include alumni people');

  const configSource = await readFile('lib/person-directory-config.ts', 'utf8');
  const directorySource = await readFile('lib/person-directory.ts', 'utf8');
  const cardSource = await readFile('components/home/ResearcherCard.tsx', 'utf8');

  assert.match(configSource, /weeklyViewCount/);
  assert.match(directorySource, /case 'risingScore'/);
  assert.doesNotMatch(cardSource, /sortBy === 'industryImpact'/);
});

test('default activity feed carries review status and keeps low-confidence items out', async () => {
  const payload = await fetchJson('/api/activity?limit=24&days=365');
  assert.ok(Array.isArray(payload.data), 'activity API should return a data array');

  for (const event of payload.data) {
    assert.equal(typeof event.reviewStatus, 'string', 'activity event should expose reviewStatus');
    assert.ok(event.confidence >= 0.7, `${event.title} should not be a low-confidence default event`);
    assert.ok(['auto', 'confirmed', 'trusted'].includes(event.reviewStatus), `${event.title} should be publishable by default`);
  }

  const activitySource = await readFile('lib/activity.ts', 'utf8');
  const materializeSource = await readFile('scripts/activity/materialize_activity_events.mjs', 'utf8');
  const signalJobSource = await readFile('lib/inngest/signalJobs.ts', 'utf8');

  assert.match(activitySource, /relation_change/);
  assert.match(activitySource, /reviewStatus/);
  assert.match(materializeSource, /relation_change/);
  assert.match(signalJobSource, /relation_change/);
});

test('compare report agent exposes the full MVP toolchain', async () => {
  const [firstPerson, secondPerson] = directoryPayload.data;
  assert.ok(firstPerson?.id && secondPerson?.id, 'directory should provide two people for compare smoke');

  const html = await fetchText(`/compare?people=${firstPerson.id},${secondPerson.id}`);
  const readinessResponse = await fetch(`${BASE_URL}/api/admin/operations/readiness`);
  assert.equal(readinessResponse.status, 401, 'operations readiness API should require admin auth');
  const readiness = await fetchOperationsReadinessFromCli();
  const text = textContent(html);
  const expectedToolLabels = ['选人', '资料', '指标', '动态', '关系', '搜索', '证据', '观点', '对齐', '审查', '报告', '校验', '保存'];
  for (const label of expectedToolLabels) {
    assert.ok(text.includes(label), `compare page should expose agent tool: ${label}`);
  }

  const compareReportSource = await readFile('lib/compare-report.ts', 'utf8');
  const compareAgentSource = await readFile('lib/compare-report-agent.ts', 'utf8');
  const launcherSource = await readFile('components/compare/CompareReportLauncher.tsx', 'utf8');
  const builderSource = await readFile('components/compare/CompareReportBuilder.tsx', 'utf8');
  const directorySource = await readFile('components/home/ResearcherDirectory.tsx', 'utf8');
  const reportDetailSource = await readFile('app/compare/reports/[id]/page.tsx', 'utf8');
  const newReportPageSource = await readFile('app/compare/reports/new/page.tsx', 'utf8');
  const reportsRouteSource = await readFile('app/api/compare/reports/route.ts', 'utf8');
  const readinessSource = await readFile('lib/operations-readiness.ts', 'utf8');
  const readinessCliSource = await readFile('scripts/ops/readiness.mjs', 'utf8');

  for (const key of ['people', 'profile', 'metrics', 'activity', 'relations', 'search', 'evidence', 'claims', 'compare', 'review', 'report', 'verify', 'publish']) {
    assert.match(compareReportSource, new RegExp(`key: '${key}'`), `tool catalog should include ${key}`);
  }

  assert.ok(readiness.schema.compareReport, 'operations readiness should include CompareReport schema');
  assert.equal(typeof readiness.schema.compareReport.eventMetadataColumn, 'boolean');
  assert.ok(readiness.compareReport, 'operations readiness should include CompareReport stats');
  assert.equal(typeof readiness.newsletterEnv.sendConfigReady, 'boolean', 'operations readiness should separate send config from send switch');
  assert.match(compareAgentSource, /load_metrics/);
  assert.match(compareAgentSource, /load_relations/);
  assert.match(compareAgentSource, /load_activity/);
  assert.match(compareAgentSource, /toolKey: 'metrics'/);
  assert.match(compareAgentSource, /tools: COMPARE_AGENT_TOOLS/);
  assert.match(compareAgentSource, /COMPARE_REPORT_STYLE_COMPONENTS/);
  assert.match(compareAgentSource, /ReportHero/);
  assert.match(compareAgentSource, /页面导航、主站 header、按钮和页面壳由产品代码负责/);
  assert.match(launcherSource, /\/compare\/reports\/new/);
  assert.doesNotMatch(launcherSource, /fixed inset-0/);
  assert.match(builderSource, /COMPARE_AGENT_TOOLS\.map/);
  assert.doesNotMatch(directorySource, /CompareReportLauncher/);
  assert.match(reportDetailSource, /SiteHeader/);
  assert.match(reportDetailSource, /<details/);
  assert.match(reportDetailSource, /生成过程与来源校验/);
  assert.match(reportDetailSource, /Agent 工具链/);
  assert.match(newReportPageSource, /CompareReportBuilder/);
  assert.match(reportsRouteSource, /toolKey: item\.toolKey/);
  assert.match(readinessSource, /checkCompareReportStore/);
  assert.match(readinessSource, /sendConfigReady/);
  assert.match(readinessSource, /newsletterEnvStatus/);
  assert.match(readinessCliSource, /checkCompareReportStore/);
  assert.match(readinessCliSource, /sendConfigReady/);
  assert.match(readinessCliSource, /newsletterEnvStatus/);
});

test('auth pages keep registration feedback hydratable in local dev', async () => {
  const proxySource = await readFile('proxy.ts', 'utf8');
  const nextConfigSource = await readFile('next.config.ts', 'utf8');
  const layoutSource = await readFile('app/layout.tsx', 'utf8');
  const arcoBridgeSource = await readFile('components/common/ArcoReactRootBridge.tsx', 'utf8');
  const loginSource = await readFile('app/login/page.tsx', 'utf8');
  const resetPasswordSource = await readFile('app/reset-password/ResetPasswordForm.tsx', 'utf8');
  const registerActionSource = await readFile('lib/actions/register.ts', 'utf8');
  const tokenSource = await readFile('lib/auth/tokens.ts', 'utf8');
  const emailSource = await readFile('lib/auth/email.ts', 'utf8');
  const globalCssSource = await readFile('app/globals.css', 'utf8');

  assert.match(proxySource, /\(\?!api\|_next\|favicon\.ico/, 'Next internals should not go through auth proxy');
  assert.match(nextConfigSource, /allowedDevOrigins:\s*\[\s*'127\.0\.0\.1'\s*\]/, '127.0.0.1 dev origin should keep HMR and hydration working');
  assert.match(nextConfigSource, /allowedOrigins:\s*\[\s*'people\.llmxy\.xyz'/, 'production reverse proxy domain should be allowed for server actions');
  assert.match(layoutSource, /ArcoReactRootBridge/, 'root layout should initialize Arco React 19 bridge');
  assert.match(arcoBridgeSource, /setCreateRoot\(createRoot\)/, 'Arco feedback APIs should use React 19 createRoot');
  assert.match(loginSource, /if \(result\?\.error\)[\s\S]+else if \(result\?\.ok\)/, 'credentials sign-in should inspect error before ok');
  assert.match(loginSource, /CredentialsSignin[\s\S]+CallbackRouteError/, 'credentials failures should map to a user-facing login error');
  assert.match(loginSource, /role="alert"/, 'registration errors should have an inline fallback');
  assert.match(loginSource, /请输入邀请码，没有邀请码无法完成注册/, 'missing invite should show an explicit registration error');
  assert.match(loginSource, /!result\.emailVerificationRequired/, 'new registrations should bypass the email verification notice while verification is paused');
  assert.match(loginSource, /Message\.success\('注册成功，请登录'\)/, 'registration should fall back to login if automatic sign-in fails');
  assert.match(loginSource, /getMailInboxUrl/, 'verification notice should guide people to their mailbox');
  assert.match(loginSource, /去邮箱查看/, 'verification notice should make checking email the primary action');
  assert.doesNotMatch(loginSource, /type="primary"[\s\S]{0,240}重发验证邮件/, 'verification resend should not be the primary action');
  assert.match(loginSource, /auth-primary-button/, 'auth form primary actions should use the black action button');
  assert.match(resetPasswordSource, /auth-primary-button/, 'reset-password action should use the same black action button');
  assert.match(globalCssSource, /auth-primary-button[\s\S]+#0c0a09/, 'auth action button styles should override Arco primary blue');
  assert.match(emailSource, /background:#0c0a09/, 'transactional email CTA should be black');
  assert.match(tokenSource, /PRODUCTION_BASE_URL[\s\S]+NEXT_PUBLIC_SITE_URL/, 'auth email links should prefer the production base URL');
  assert.match(tokenSource, /isLocalSiteUrl/, 'production auth email links should avoid localhost candidates when a public URL exists');
  assert.match(registerActionSource, /const hashedPassword = await bcrypt\.hash\(password, 10\);[\s\S]+prisma\.\$transaction/, 'password hashing should finish before opening the registration transaction');
  assert.match(registerActionSource, /EMAIL_VERIFICATION_REQUIRED = false/, 'email verification should be explicitly paused for open registration');
  assert.match(registerActionSource, /EMAIL_VERIFICATION_REQUIRED \? UserStatus\.PENDING_EMAIL : UserStatus\.ACTIVE/, 'new users should be active while email verification is paused');
  assert.match(registerActionSource, /EMAIL_VERIFICATION_SKIPPED/, 'skipped email verification should be auditable');
  assert.match(registerActionSource, /timeout:\s*20_000/, 'registration transaction should have an explicit timeout');
  assert.match(registerActionSource, /isExpectedRegistrationError/, 'registration should not expose raw database errors to the form');
});

test('directory filters are URL-shareable for topic, organization, role, and clearing', async () => {
  const topic = directoryPayload.data.find(person => person.topics?.length)?.topics[0];
  assert.ok(topic, 'fixture data should include at least one topic');

  const topicHtml = await fetchText(`/?view=topic&topic=${encodeURIComponent(topic)}`);
  assert.ok(textContent(topicHtml).includes(`话题：${topic}`), 'topic filter should render from URL state');

  const orgHtml = await fetchText('/?view=organization&organization=OpenAI');
  assert.ok(textContent(orgHtml).includes('机构：OpenAI'), 'organization filter should render from URL state');

  const roleHtml = await fetchText('/?view=role&role=researcher');
  assert.ok(textContent(roleHtml).includes('角色：研究科学家'), 'role filter should render from URL state');

  const searchHtml = await fetchText('/?search=Yann');
  assert.ok(textContent(searchHtml).includes('搜索：Yann'), 'search filter should render from URL state');

  const directorySource = await readFile('components/home/ResearcherDirectory.tsx', 'utf8');
  assert.match(directorySource, /function buildDirectoryPageUrl/);
  assert.match(directorySource, /return query \? `\/\?\$\{query\}` : '\/'/);
  assert.match(directorySource, /handleClearFilters/);
});

test('organization filters require role evidence or explicit current title evidence', async () => {
  const directorySource = await readFile('lib/person-directory.ts', 'utf8');
  const cardSource = await readFile('components/home/ResearcherCard.tsx', 'utf8');

  assert.doesNotMatch(
    directorySource,
    /organization:\s*\{\s*hasSome:\s*organizationAliases\s*\}/,
    'organization filters should not include profile-only organization array matches',
  );
  assert.match(
    directorySource,
    /roles:\s*\{\s*some:\s*organizationRoleWhere\s*\}/,
    'organization filters should include sourced role matches',
  );
  assert.match(
    directorySource,
    /currentTitle:\s*\{\s*contains:\s*alias,\s*mode:\s*'insensitive'/,
    'organization filters may include explicit current-title evidence',
  );
  assert.match(
    directorySource,
    /const status = matchingRole\.endDate\s*\?\s*'past'/,
    'ended organization roles should be labeled past even if currentTitle mentions the org',
  );
  assert.match(
    directorySource,
    /titleMentionsFormerTenure/,
    'former or previously title wording should prevent stale roles from looking current',
  );
  assert.match(
    directorySource,
    /currentTitleHasDifferentAtOrganization/,
    'current title evidence should override open-ended stale roles for other organizations',
  );
  assert.match(
    cardSource,
    /const fallbackEndYear = match\.status === 'past' \? '未知' : '至今'/,
    'past roles without end dates should not display as current',
  );
});

test('Yao Shunyu name collision stays split across Tencent and DeepMind identities', async () => {
  for (const query of ['Shunyu%20Yao', 'Yao%20Shunyu', 'yaoshunyu']) {
    const payload = await fetchJson(`/api/person/directory?search=${query}&limit=48`);
    assert.ok(payload.data.find(person => person.name === '姚顺雨'), `${query} search should include the AI-agent/Tencent profile`);
    assert.ok(payload.data.find(person => person.name === '姚顺宇'), `${query} search should include the physics/DeepMind profile`);
  }

  const searchPayload = await fetchJson('/api/person/directory?search=Shunyu%20Yao&limit=48');
  const vincesYao = searchPayload.data.find(person => person.name === '姚顺雨');
  const physicsYao = searchPayload.data.find(person => person.name === '姚顺宇');

  assert.ok(vincesYao, 'searching Shunyu Yao should include the AI-agent/Tencent profile');
  assert.ok(physicsYao, 'searching Shunyu Yao should include the physics/DeepMind profile');
  assert.match(vincesYao.currentTitle || '', /Tencent/);
  assert.match(physicsYao.currentTitle || '', /Google DeepMind/);
  assert.ok(!JSON.stringify(vincesYao.highlights || []).includes('阶跃星辰'), 'Vinces Yao directory highlights should not contain unrelated StepFun claims');
  assert.ok(!JSON.stringify(vincesYao.highlights || []).includes('Step-2'), 'Vinces Yao directory highlights should not contain unrelated Step-2 claims');

  const tencentPayload = await fetchJson('/api/person/directory?organization=%E8%85%BE%E8%AE%AF&limit=48');
  const tencentNames = tencentPayload.data.map(person => person.name);
  assert.ok(tencentNames.includes('姚顺雨'), 'Tencent filter should include Vinces Yao');
  assert.ok(!tencentNames.includes('姚顺宇'), 'Tencent filter should not include the physics/DeepMind Shunyu Yao');

  const deepmindPayload = await fetchJson('/api/person/directory?organization=DeepMind&limit=48');
  const deepmindNames = deepmindPayload.data.map(person => person.name);
  assert.ok(deepmindNames.includes('姚顺宇'), 'DeepMind filter should include the physics Shunyu Yao');
  assert.ok(!deepmindNames.includes('姚顺雨'), 'DeepMind filter should not include the AI-agent/Tencent Shunyu Yao');

  const vincesDetailHtml = await fetchText(`/person/${vincesYao.id}`);
  const vincesDetailText = textContent(vincesDetailHtml);
  assert.ok(vincesDetailText.includes('ReAct'), 'Vinces Yao detail should retain language-agent work');
  assert.ok(vincesDetailText.includes('SWE-agent'), 'Vinces Yao detail should retain SWE-agent work');
  assert.ok(!vincesDetailHtml.includes('alfredyao.github.io'), 'Vinces Yao detail should not include Alfred Yao sources');
  assert.ok(!vincesDetailText.includes('Theoretical Physics'), 'Vinces Yao detail should not include the physics Shunyu Yao education');
  assert.ok(!vincesDetailText.includes('Claude 强化学习'), 'Vinces Yao detail should not include the physics Shunyu Yao cards');
});

test('DeepSeek organization filter marks Liang Wenfeng current and keeps former contributors separate', async () => {
  const deepseekPayload = await fetchJson('/api/person/directory?organization=DeepSeek&limit=48');
  const liangWenfeng = findPerson(deepseekPayload, '梁文锋');
  const luoFuli = findPerson(deepseekPayload, '罗福莉');

  assert.equal(liangWenfeng.organizationMatch?.status, 'current', 'Liang Wenfeng should show as current DeepSeek');
  assert.equal(liangWenfeng.organizationMatch?.role, '创始人兼 CEO', 'Liang Wenfeng DeepSeek role should be readable');
  assert.match(liangWenfeng.currentTitle || '', /Founder & CEO @ DeepSeek/);
  assert.equal(luoFuli.organizationMatch?.status, 'past', 'Luo Fuli should show as former DeepSeek after moving to Xiaomi');
  assert.doesNotMatch(luoFuli.currentTitle || '', /inferred from reports/i);

  const liangDetailHtml = await fetchText(`/person/${liangWenfeng.id}`);
  const luoDetailHtml = await fetchText(`/person/${luoFuli.id}`);
  assert.ok(!textContent(liangDetailHtml).includes('HKBU COMP'), 'Liang detail should not include wrong HKBU role');
  assert.ok(!textContent(liangDetailHtml).includes('Foshan University'), 'Liang detail should not include wrong Foshan University role');
  assert.ok(!textContent(luoDetailHtml).includes('China Editor'), 'Luo detail should not include wrong China Editor role');
});

test('organization filters distinguish current and former affiliations for OpenAI and Anthropic', async () => {
  const anthropicPayload = await fetchJson('/api/person/directory?organization=Anthropic&limit=48');
  const janLeike = findPerson(anthropicPayload, 'Jan Leike');
  const borisCherny = findPerson(anthropicPayload, 'Boris Cherny');
  const nikiParmar = findPerson(anthropicPayload, '妮基·帕尔玛');

  assert.equal(janLeike.organizationMatch?.status, 'current', 'Jan Leike should show as current Anthropic');
  assert.equal(borisCherny.organizationMatch?.status, 'current', 'Boris Cherny should show as current Anthropic');
  assert.equal(nikiParmar.organizationMatch?.status, 'current', 'Niki Parmar should show as current Anthropic');

  const openaiPayload = await fetchJson('/api/person/directory?organization=OpenAI&limit=48');
  const ilyaSutskever = findPerson(openaiPayload, 'Ilya Sutskever');
  const miraMurati = findPerson(openaiPayload, 'Mira Murati');
  const danielaAmodei = findPerson(openaiPayload, 'Daniela Amodei');
  const bobMcGrew = findPerson(openaiPayload, 'Bob McGrew');
  const sebastienBubeck = findPerson(openaiPayload, '塞巴斯蒂安·布贝克');
  const joanneJang = findPerson(openaiPayload, 'Joanne Jang');

  assert.equal(ilyaSutskever.organizationMatch?.status, 'past', 'Ilya Sutskever should show as former OpenAI');
  assert.equal(miraMurati.organizationMatch?.status, 'past', 'Mira Murati should show as former OpenAI');
  assert.equal(danielaAmodei.organizationMatch?.status, 'past', 'Daniela Amodei should show as former OpenAI');
  assert.equal(bobMcGrew.organizationMatch?.status, 'past', 'Bob McGrew should show as former OpenAI');
  assert.equal(sebastienBubeck.organizationMatch?.status, 'current', 'Sebastien Bubeck should show as current OpenAI');
  assert.equal(joanneJang.organizationMatch?.status, 'past', 'Joanne Jang should show as former OpenAI');
});

test('organization filters clear residual role-only ambiguity for Google, DeepMind, Stanford, and Berkeley', async () => {
  const deepmindPayload = await fetchJson('/api/person/directory?organization=DeepMind&limit=48');
  const googlePayload = await fetchJson('/api/person/directory?organization=Google&limit=48');
  const stanfordPayload = await fetchJson('/api/person/directory?organization=Stanford&limit=48');
  const berkeleyPayload = await fetchJson('/api/person/directory?organization=Berkeley&limit=48');

  assertNoRoleOnlyMatches('DeepMind', deepmindPayload);
  assertNoRoleOnlyMatches('Google', googlePayload);
  assertNoRoleOnlyMatches('Stanford', stanfordPayload);
  assertNoRoleOnlyMatches('Berkeley', berkeleyPayload);

  const korayAtDeepMind = findPerson(deepmindPayload, '科拉伊·卡武克丘奥卢');
  const davidAtDeepMind = findPerson(deepmindPayload, 'David Silver');
  const danAtBerkeley = findPerson(berkeleyPayload, '丹·克莱因');
  const danAtStanford = findPerson(stanfordPayload, '丹·克莱因');

  assert.equal(korayAtDeepMind.organizationMatch?.status, 'current', 'Koray should show as current Google DeepMind');
  assert.equal(davidAtDeepMind.organizationMatch?.status, 'past', 'David Silver should show as former Google DeepMind');
  assert.equal(danAtBerkeley.organizationMatch?.status, 'current', 'Dan Klein should show as current Berkeley');
  assert.equal(danAtBerkeley.organizationMatch?.role, '教授', 'Dan Klein Berkeley role should be readable');
  assert.equal(danAtStanford.organizationMatch?.status, 'past', 'Dan Klein should show as former Stanford');
});

test('detail page SSR does not depend on useSearchParams or spinner fallback', async () => {
  const firstPerson = directoryPayload.data[0];
  const topic = firstPerson.topics?.[0] || '';
  const html = await fetchText(`/person/${firstPerson.id}?section=topics&highlight=${encodeURIComponent(topic)}`);

  assert.ok(html.includes(firstPerson.name), 'detail SSR HTML should include person name');
  assert.ok(html.includes('自动整理'), 'detail header should show user-facing source summary');
  assert.ok(html.includes('成果与资料'), 'works section title should be user-facing');
  assert.ok(!html.includes('听 TA 亲自讲'), 'old video section title should not render');
  assert.ok(!html.includes('已就绪'), 'internal readiness badge should not render');
  assert.ok(!html.includes('border-t-orange-500'), 'spinner fallback should not be in SSR HTML');

  const clientSource = await readFile('components/person/PersonPageClient.tsx', 'utf8');
  assert.doesNotMatch(clientSource, /useSearchParams/);
  assert.match(clientSource, /initialSection\?: 'topics' \| null/);
  assert.match(clientSource, /highlightTopic\?: string \| null/);
});

test('lazy sections expose retry states and trust labels instead of silent empty states', async () => {
  const featuredWorks = await readFile('components/person/sections/FeaturedWorks.tsx', 'utf8');
  const videoSection = await readFile('components/person/sections/VideoSection.tsx', 'utf8');
  const courseSection = await readFile('components/person/sections/CourseSection.tsx', 'utf8');
  const relatedPeople = await readFile('components/person/sections/RelatedPeople.tsx', 'utf8');
  const relationshipGraph = await readFile('components/person/sections/RelationshipGraphExplorer.tsx', 'utf8');
  const globalGraphPage = await readFile('app/graph/page.tsx', 'utf8');
  const personHeader = await readFile('components/person/sections/PersonHeader.tsx', 'utf8');
  const coursesRoute = await readFile('app/api/person/[id]/courses/route.ts', 'utf8');
  const detailPage = await readFile('app/person/[id]/page.tsx', 'utf8');

  for (const source of [featuredWorks, videoSection, courseSection]) {
    assert.match(source, /加载失败/);
    assert.match(source, /重试/);
  }

  assert.match(featuredWorks, /成果与资料/);
  assert.match(featuredWorks, /有来源/);
  assert.match(featuredWorks, /自动整理/);
  assert.match(featuredWorks, /overflow-x-auto/);
  assert.match(videoSection, /视频与访谈/);
  assert.match(videoSection, /第三方分析/);
  assert.match(courseSection, /已验证/);
  assert.match(courseSection, /待核/);
  assert.match(coursesRoute, /confidence: course\.confidence/);
  assert.match(relatedPeople, /待核关系/);
  assert.match(relatedPeople, /former_colleague: \{ label: '前同事'/);
  assert.match(relationshipGraph, /former_colleague: '前同事'/);
  assert.match(globalGraphPage, /former_colleague: '前同事'/);
  assert.match(relatedPeople, /organizationFromTitle/);
  assert.doesNotMatch(relatedPeople, /relatedPerson\.organization\?\.\[0\]/);
  assert.match(detailPage, /currentTitle: true/);
  assert.match(personHeader, /useState\(false\)/);
  assert.match(personHeader, /person\.currentTitle/);
});

async function fetchText(path) {
  const response = await fetch(`${BASE_URL}${path}`);
  assert.equal(response.ok, true, `GET ${path} should return ${response.status}`);
  return response.text();
}

async function fetchJson(path) {
  const response = await fetch(`${BASE_URL}${path}`);
  assert.equal(response.ok, true, `GET ${path} should return ${response.status}`);
  return response.json();
}

async function fetchOperationsReadinessFromCli() {
  if (operationsReadiness) return operationsReadiness;

  operationsReadiness = await new Promise((resolve, reject) => {
    const child = spawn('node', ['scripts/ops/readiness.mjs'], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', chunk => {
      stdout += chunk;
    });
    child.stderr.on('data', chunk => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', code => {
      if (code !== 0) {
        reject(new Error(`readiness CLI failed with code ${code}: ${stderr || stdout}`));
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`readiness CLI returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  });

  return operationsReadiness;
}

async function fetchAllDirectoryPeople() {
  if (allDirectoryPeople) return allDirectoryPeople;

  const people = [];
  let page = 1;
  while (true) {
    const payload = await fetchJson(`/api/person/directory?page=${page}&limit=48&sortBy=influenceScore`);
    people.push(...payload.data);
    if (!payload.pagination?.hasMore) break;
    page += 1;
  }

  allDirectoryPeople = people;
  return people;
}

function textContent(html) {
  return cheerio.load(html).text();
}

function findPerson(payload, name) {
  const person = payload.data.find(item => item.name === name);
  assert.ok(person, `${name} should be present in directory response`);
  return person;
}

function assertNoRoleOnlyMatches(label, payload) {
  const roleOnly = payload.data
    .filter(person => person.organizationMatch?.status === 'role')
    .map(person => person.name);

  assert.equal(roleOnly.length, 0, `${label} should not expose role-only ambiguous matches: ${roleOnly.join(', ')}`);
}

async function isServerReady() {
  try {
    const response = await fetch(`${BASE_URL}/api/person/directory?page=1&limit=1`);
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 20000) {
    if (await isServerReady()) return;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  const stderr = await readStreamSnapshot(serverProcess?.stderr);
  throw new Error(`Timed out waiting for ${BASE_URL}\n${stderr}`);
}

async function readStreamSnapshot(stream) {
  if (!stream) return '';
  const chunks = [];
  stream.on('data', chunk => chunks.push(chunk));
  await new Promise(resolve => setTimeout(resolve, 50));
  return Buffer.concat(chunks).toString('utf8');
}
