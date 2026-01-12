/**
 * 为缺少头像的人物补充头像
 * 先搜索 Twitter/GitHub 账号，然后用 unavatar.io 获取头像
 *
 * 用法: npx tsx scripts/enrich/fix_missing_avatars_v2.ts
 */

import 'dotenv/config';
import { prisma } from '../../lib/db/prisma';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// 需要补充头像的人物列表（手工整理的 Twitter/GitHub 账号）
const AVATAR_SOURCES: Record<string, { twitter?: string; github?: string }> = {
  'Lex Fridman': { twitter: 'lexfridman' },
  'Leslie Kaelbling': { github: 'lpk' },  // MIT professor, try GitHub
  'Sergey Levine': { twitter: 'svaborowiec', github: 'svlevine' },
  'Alexander Amini': { twitter: 'xananderiv', github: 'amini' },
  'Hamel Husain': { twitter: 'HamelHusain', github: 'hamelsmu' },
  'Sam Witteveen': { twitter: 'Sam_Witteveen', github: 'samwit' },  // 正确的 Twitter handle
  'Tom Mitchell': { },  // CMU professor, no public social media found
};

/**
 * 下载头像并保存到本地
 */
async function downloadAvatar(url: string, personId: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      console.log(`    HTTP ${response.status}`);
      return null;
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('image')) {
      console.log(`    Not an image: ${contentType}`);
      return null;
    }

    const buffer = await response.arrayBuffer();

    // 检查文件大小
    if (buffer.byteLength < 1000) {
      console.log(`    Image too small: ${buffer.byteLength} bytes`);
      return null;
    }

    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const hash = crypto.createHash('md5').update(personId).digest('hex').slice(0, 8);
    const filename = `${hash}.${ext}`;
    const filePath = path.join(process.cwd(), 'public', 'avatars', filename);

    // 确保目录存在
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, Buffer.from(buffer));

    return `/avatars/${filename}`;
  } catch (error) {
    console.log(`    Error: ${error}`);
    return null;
  }
}

async function main() {
  console.log('=== 补充缺失头像 ===\n');

  const people = await prisma.people.findMany({
    where: {
      OR: [
        { avatarUrl: null },
        { avatarUrl: '' }
      ]
    },
    select: {
      id: true,
      name: true,
      completeness: true,
    }
  });

  console.log(`找到 ${people.length} 个缺失头像的人物\n`);

  let fixedCount = 0;

  for (const person of people) {
    const sources = AVATAR_SOURCES[person.name];

    if (!sources) {
      console.log(`- ${person.name}: 无预设来源，跳过`);
      continue;
    }

    console.log(`+ ${person.name}:`);

    let avatarPath: string | null = null;

    // 优先尝试 Twitter
    if (sources.twitter && !avatarPath) {
      console.log(`  尝试 Twitter @${sources.twitter}...`);
      const url = `https://unavatar.io/twitter/${sources.twitter}?fallback=false`;
      avatarPath = await downloadAvatar(url, person.id);
    }

    // 尝试 GitHub
    if (sources.github && !avatarPath) {
      console.log(`  尝试 GitHub @${sources.github}...`);
      const url = `https://unavatar.io/github/${sources.github}?fallback=false`;
      avatarPath = await downloadAvatar(url, person.id);
    }

    if (avatarPath) {
      // 更新数据库
      await prisma.people.update({
        where: { id: person.id },
        data: {
          avatarUrl: avatarPath,
          completeness: person.completeness + 15  // 头像占 15%
        }
      });
      console.log(`  ✓ 已保存: ${avatarPath}`);
      console.log(`  ✓ completeness: ${person.completeness}% -> ${person.completeness + 15}%`);
      fixedCount++;
    } else {
      console.log(`  ✗ 下载失败`);
    }

    // 避免请求过快
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\n=== 完成 ===`);
  console.log(`成功: ${fixedCount}, 总数: ${people.length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
