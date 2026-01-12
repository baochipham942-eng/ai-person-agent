/**
 * 头像问题检测与修复脚本
 *
 * 问题类型：
 * 1. GitHub 默认占位图（identicon，文件 < 2KB）
 * 2. 错误人物照片（如朱军 - 央视主持人 vs 清华教授）
 * 3. Logo 而非人物照片（如 Twitch logo）
 * 4. 抽象/无效图片
 * 5. unavatar.io 动态链接（可能失效）
 * 6. 外部 CDN 链接（可能有防盗链）
 *
 * 修复策略：
 * 1. X/Twitter 头像 (unavatar.io/x/{handle})
 * 2. 个人网站/学术主页抓取
 * 3. Wikidata P18 属性
 * 4. Google Scholar
 * 5. 百度百科
 * 6. GitHub 头像
 *
 * 用法:
 *   npx tsx scripts/enrich/fix_problem_avatars.ts --audit          # 仅审计，不修复
 *   npx tsx scripts/enrich/fix_problem_avatars.ts --fix            # 自动修复
 *   npx tsx scripts/enrich/fix_problem_avatars.ts --fix --limit=10 # 修复前10个
 *   npx tsx scripts/enrich/fix_problem_avatars.ts --quiet          # 静默模式
 */

import 'dotenv/config';
import { prisma } from '../../lib/db/prisma';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============ 配置 ============

// 已知问题人物的正确头像来源（手工整理）
const MANUAL_AVATAR_SOURCES: Record<string, {
  twitter?: string;
  github?: string;
  website?: string;
  note?: string;
}> = {
  // GitHub identicon 问题
  'Lukasz Kaiser': { twitter: 'lukaborowiec', github: 'lukaszkaiser' },
  'Rob Bensinger': { twitter: 'robbensinger' },
  '凯文·斯科特': { twitter: 'kevin_scott', note: 'Microsoft CTO' },
  '周明': { note: '澜舟科技创始人，需从百度百科获取' },
  '拉兹万·帕斯卡努': { twitter: 'rpascanu', github: 'pascanur' },
  'Leslie Kaelbling': { website: 'https://people.csail.mit.edu/lpk/' },

  // 朱军已修复 - 从清华官网获取正确头像

  // Logo 问题
  '丁洁': { twitter: 'jieDing16', note: '明尼苏达大学副教授' },
  '陈冕': { note: 'Lovart AI CEO，需从公司官网或新闻获取' },
  'James Manyika': { twitter: 'maborowiec', note: 'Google SVP' },

  // 抽象图片
  '丹尼尔·格罗斯': { twitter: 'danielgross' },

  // unavatar 可能失效
  'Chelsea Finn': { twitter: 'cbfinn', website: 'https://ai.stanford.edu/~cbfinn/' },
  'Jay Alammar': { twitter: 'JayAlammar', github: 'jalammar' },
  'Yann Dubois': { twitter: 'yanaborowiec', github: 'YannDubs' },
  'Tianqi Chen': { twitter: 'taborowiec', github: 'tqchen' },
  'Graham Neubig': { twitter: 'neaborowiec', github: 'neubig' },
  'Jason Liu': { twitter: 'jaborowiec', github: 'jxnl' },
  'Louis-François Bouchard': { twitter: 'Whats_AI', github: 'louisfb01' },
};

// 小文件阈值（字节），低于此值可能是占位图
const SMALL_FILE_THRESHOLD = 6000;

// GitHub identicon 的典型文件大小
const IDENTICON_SIZES = [1506, 1520, 1535, 1546, 1548, 1566];

// ============ 类型定义 ============

interface ProblemAvatar {
  id: string;
  name: string;
  avatarUrl: string | null;
  qid: string | null;
  officialLinks: any[];
  problemType: AvatarProblemType;
  fileSize?: number;
}

type AvatarProblemType =
  | 'github_identicon'      // GitHub 默认占位图
  | 'wrong_person'          // 错误人物照片
  | 'logo_not_photo'        // Logo 而非人物照片
  | 'abstract_image'        // 抽象图片
  | 'unavatar_link'         // unavatar.io 动态链接
  | 'external_cdn'          // 外部 CDN 链接
  | 'missing'               // 缺失头像
  | 'small_file';           // 可疑小文件

interface AuditResult {
  total: number;
  problems: ProblemAvatar[];
  byType: Record<AvatarProblemType, number>;
}

// ============ 工具函数 ============

const args = process.argv.slice(2);
const isAuditOnly = args.includes('--audit');
const isFix = args.includes('--fix');
const isQuiet = args.includes('--quiet');
const limitArg = args.find(a => a.startsWith('--limit='));
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined;

function log(msg: string) {
  if (!isQuiet) console.log(msg);
}

/**
 * 获取本地头像文件大小
 */
function getLocalAvatarFileSize(avatarUrl: string): number | null {
  if (!avatarUrl.startsWith('/avatars/')) return null;

  const filename = avatarUrl.replace('/avatars/', '');
  const filePath = path.join(process.cwd(), 'public', 'avatars', filename);

  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return null;
  }
}

/**
 * 检测头像问题类型
 */
function detectProblemType(person: {
  avatarUrl: string | null;
  name: string;
}): AvatarProblemType | null {
  const { avatarUrl, name } = person;

  // 1. 缺失头像
  if (!avatarUrl || avatarUrl === '') {
    return 'missing';
  }

  // 2. unavatar.io 动态链接
  if (avatarUrl.includes('unavatar.io')) {
    return 'unavatar_link';
  }

  // 3. 外部 CDN 链接
  if (avatarUrl.includes('bkimg.cdn.bcebos') ||
      avatarUrl.includes('pbs.twimg') ||
      avatarUrl.includes('upload.wikimedia')) {
    return 'external_cdn';
  }

  // 4. 本地文件检查
  if (avatarUrl.startsWith('/avatars/')) {
    const fileSize = getLocalAvatarFileSize(avatarUrl);

    if (fileSize === null) {
      return 'missing'; // 文件不存在
    }

    // GitHub identicon 特征：特定文件大小
    if (IDENTICON_SIZES.includes(fileSize)) {
      return 'github_identicon';
    }

    // 可疑小文件
    if (fileSize < SMALL_FILE_THRESHOLD) {
      return 'small_file';
    }
  }

  // 5. 已知问题人物
  if (MANUAL_AVATAR_SOURCES[name]) {
    const source = MANUAL_AVATAR_SOURCES[name];
    if (source.note?.includes('错误') || source.note?.includes('非')) {
      return 'wrong_person';
    }
  }

  return null;
}

/**
 * 下载头像并保存到本地
 */
async function downloadAvatar(
  url: string,
  personId: string,
  forceOverwrite = false
): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'image/*',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      log(`    HTTP ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('image')) {
      log(`    Not an image: ${contentType}`);
      return null;
    }

    const buffer = await response.arrayBuffer();

    // 检查文件大小
    if (buffer.byteLength < 1000) {
      log(`    Image too small: ${buffer.byteLength} bytes`);
      return null;
    }

    // 检查是否是 identicon
    if (IDENTICON_SIZES.includes(buffer.byteLength)) {
      log(`    Detected GitHub identicon (${buffer.byteLength} bytes), skipping`);
      return null;
    }

    // 确定扩展名
    let ext = 'jpg';
    if (contentType.includes('png')) ext = 'png';
    else if (contentType.includes('webp')) ext = 'webp';

    const hash = crypto.createHash('md5').update(personId + Date.now()).digest('hex').slice(0, 8);
    const filename = `${hash}.${ext}`;
    const filePath = path.join(process.cwd(), 'public', 'avatars', filename);

    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, Buffer.from(buffer));
    log(`    Saved: ${filename} (${buffer.byteLength} bytes)`);

    return `/avatars/${filename}`;
  } catch (error) {
    log(`    Error: ${error}`);
    return null;
  }
}

/**
 * 从 X/Twitter 获取头像
 */
async function fetchFromTwitter(handle: string, personId: string): Promise<string | null> {
  const cleanHandle = handle.replace('@', '').trim();
  // unavatar.io 现在使用 /x/ 而非 /twitter/
  const url = `https://unavatar.io/x/${cleanHandle}?fallback=false`;

  log(`    Trying X @${cleanHandle}...`);
  return downloadAvatar(url, personId, true);
}

/**
 * 从 GitHub 获取头像
 */
async function fetchFromGitHub(username: string, personId: string): Promise<string | null> {
  const url = `https://github.com/${username}.png?size=400`;

  log(`    Trying GitHub @${username}...`);
  return downloadAvatar(url, personId, true);
}

/**
 * 从 Wikidata 获取头像 (P18 属性)
 */
async function fetchFromWikidata(qid: string, personId: string): Promise<string | null> {
  if (!qid || qid.startsWith('TEMP') || qid.startsWith('BAIKE') || qid.startsWith('manual')) {
    return null;
  }

  log(`    Trying Wikidata ${qid}...`);

  try {
    const sparqlQuery = `
      SELECT ?image WHERE {
        wd:${qid} wdt:P18 ?image.
      }
      LIMIT 1
    `;

    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(sparqlQuery)}&format=json`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'AI-Person-Agent/1.0' }
    });

    if (!response.ok) return null;

    const data = await response.json();
    const imageUrl = data.results?.bindings?.[0]?.image?.value;

    if (!imageUrl) {
      log(`    No image found on Wikidata`);
      return null;
    }

    // Wikimedia Commons URL 需要转换为直接图片链接
    // 例如: http://commons.wikimedia.org/wiki/Special:FilePath/Example.jpg
    return downloadAvatar(imageUrl, personId, true);
  } catch (error) {
    log(`    Wikidata error: ${error}`);
    return null;
  }
}

/**
 * 从个人网站抓取头像
 */
async function fetchFromWebsite(websiteUrl: string, personId: string): Promise<string | null> {
  log(`    Trying website: ${websiteUrl}...`);

  try {
    const response = await fetch(websiteUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      }
    });

    if (!response.ok) return null;

    const html = await response.text();

    // 尝试找到头像图片
    // 常见模式：profile-img, avatar, photo, headshot
    const imgPatterns = [
      /src=["']([^"']+(?:profile|avatar|photo|headshot|portrait)[^"']*\.(?:jpg|jpeg|png|webp))["']/i,
      /src=["']([^"']+\.(?:jpg|jpeg|png|webp))["'][^>]*class=["'][^"']*(?:profile|avatar|photo)[^"']*["']/i,
      /<img[^>]+src=["']([^"']+\.(?:jpg|jpeg|png|webp))["'][^>]*alt=["'][^"']*(?:photo|portrait|headshot)[^"']*["']/i,
    ];

    for (const pattern of imgPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        let imgUrl = match[1];

        // 处理相对路径
        if (imgUrl.startsWith('/')) {
          const urlObj = new URL(websiteUrl);
          imgUrl = `${urlObj.protocol}//${urlObj.host}${imgUrl}`;
        } else if (!imgUrl.startsWith('http')) {
          const baseUrl = websiteUrl.replace(/\/[^\/]*$/, '/');
          imgUrl = baseUrl + imgUrl;
        }

        const result = await downloadAvatar(imgUrl, personId, true);
        if (result) return result;
      }
    }

    return null;
  } catch (error) {
    log(`    Website error: ${error}`);
    return null;
  }
}

/**
 * 尝试多种方式获取头像
 */
async function tryFetchAvatar(person: ProblemAvatar): Promise<string | null> {
  const { id, name, qid, officialLinks } = person;

  // 1. 检查手工配置的来源
  const manualSource = MANUAL_AVATAR_SOURCES[name];

  // 2. 从 officialLinks 提取 handles
  const links = officialLinks || [];
  const xLink = links.find((l: any) => l.type === 'x' || l.type === 'twitter');
  const githubLink = links.find((l: any) => l.type === 'github');
  const websiteLink = links.find((l: any) => l.type === 'website');

  const xHandle = manualSource?.twitter || xLink?.handle?.replace('@', '') ||
                  xLink?.url?.match(/(?:twitter|x)\.com\/([^\/\?]+)/)?.[1];
  const githubHandle = manualSource?.github || githubLink?.handle ||
                       githubLink?.url?.match(/github\.com\/([^\/\?]+)/)?.[1];
  const websiteUrl = manualSource?.website || websiteLink?.url;

  // 按优先级尝试
  let avatarPath: string | null = null;

  // 优先级 1: X/Twitter
  if (xHandle && !avatarPath) {
    avatarPath = await fetchFromTwitter(xHandle, id);
    if (avatarPath) return avatarPath;
    await sleep(500);
  }

  // 优先级 2: GitHub (非 identicon)
  if (githubHandle && !avatarPath) {
    avatarPath = await fetchFromGitHub(githubHandle, id);
    if (avatarPath) return avatarPath;
    await sleep(500);
  }

  // 优先级 3: Wikidata
  if (qid && !avatarPath) {
    avatarPath = await fetchFromWikidata(qid, id);
    if (avatarPath) return avatarPath;
    await sleep(500);
  }

  // 优先级 4: 个人网站
  if (websiteUrl && !avatarPath) {
    avatarPath = await fetchFromWebsite(websiteUrl, id);
    if (avatarPath) return avatarPath;
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============ 主函数 ============

async function auditAvatars(): Promise<AuditResult> {
  log('=== 头像问题审计 ===\n');

  const people = await prisma.people.findMany({
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      qid: true,
      officialLinks: true,
    }
  });

  const problems: ProblemAvatar[] = [];
  const byType: Record<AvatarProblemType, number> = {
    github_identicon: 0,
    wrong_person: 0,
    logo_not_photo: 0,
    abstract_image: 0,
    unavatar_link: 0,
    external_cdn: 0,
    missing: 0,
    small_file: 0,
  };

  for (const person of people) {
    const problemType = detectProblemType({
      avatarUrl: person.avatarUrl,
      name: person.name,
    });

    if (problemType) {
      const fileSize = person.avatarUrl?.startsWith('/avatars/')
        ? getLocalAvatarFileSize(person.avatarUrl) || undefined
        : undefined;

      problems.push({
        id: person.id,
        name: person.name,
        avatarUrl: person.avatarUrl,
        qid: person.qid,
        officialLinks: (person.officialLinks as any[]) || [],
        problemType,
        fileSize,
      });

      byType[problemType]++;
    }
  }

  return { total: people.length, problems, byType };
}

async function fixAvatars(problems: ProblemAvatar[], maxFix?: number): Promise<{
  fixed: number;
  failed: number;
  skipped: number;
}> {
  log('\n=== 开始修复头像 ===\n');

  let fixed = 0;
  let failed = 0;
  let skipped = 0;

  const toFix = maxFix ? problems.slice(0, maxFix) : problems;

  for (let i = 0; i < toFix.length; i++) {
    const person = toFix[i];

    console.log(`[${i + 1}/${toFix.length}] ${person.name} (${person.problemType})`);

    // 跳过某些需要手工处理的情况
    if (person.problemType === 'wrong_person') {
      log(`  ⚠ 需要手工处理：错误人物照片`);
      skipped++;
      continue;
    }

    const newAvatarPath = await tryFetchAvatar(person);

    if (newAvatarPath) {
      // 更新数据库
      await prisma.people.update({
        where: { id: person.id },
        data: { avatarUrl: newAvatarPath }
      });

      console.log(`  ✓ 已修复: ${newAvatarPath}`);
      fixed++;
    } else {
      console.log(`  ✗ 修复失败`);
      failed++;
    }

    // 避免请求过快
    await sleep(1000);
  }

  return { fixed, failed, skipped };
}

async function main() {
  if (!isAuditOnly && !isFix) {
    console.log('用法:');
    console.log('  npx tsx scripts/enrich/fix_problem_avatars.ts --audit          # 仅审计');
    console.log('  npx tsx scripts/enrich/fix_problem_avatars.ts --fix            # 自动修复');
    console.log('  npx tsx scripts/enrich/fix_problem_avatars.ts --fix --limit=10 # 修复前10个');
    console.log('  npx tsx scripts/enrich/fix_problem_avatars.ts --quiet          # 静默模式');
    process.exit(0);
  }

  // 审计
  const audit = await auditAvatars();

  console.log('\n=== 审计结果 ===');
  console.log(`总人数: ${audit.total}`);
  console.log(`问题头像: ${audit.problems.length}`);
  console.log('');
  console.log('按问题类型分类:');
  for (const [type, count] of Object.entries(audit.byType)) {
    if (count > 0) {
      console.log(`  ${type}: ${count}`);
    }
  }

  if (!isQuiet && audit.problems.length > 0) {
    console.log('\n问题头像详情:');
    for (const p of audit.problems.slice(0, 20)) {
      const sizeInfo = p.fileSize ? ` (${p.fileSize} bytes)` : '';
      console.log(`  - ${p.name}: ${p.problemType}${sizeInfo}`);
    }
    if (audit.problems.length > 20) {
      console.log(`  ... 还有 ${audit.problems.length - 20} 个`);
    }
  }

  // 修复
  if (isFix && audit.problems.length > 0) {
    const result = await fixAvatars(audit.problems, limit);

    console.log('\n=== 修复结果 ===');
    console.log(`成功: ${result.fixed}`);
    console.log(`失败: ${result.failed}`);
    console.log(`跳过: ${result.skipped}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
