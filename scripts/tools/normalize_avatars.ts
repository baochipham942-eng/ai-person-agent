/**
 * 头像标准化脚本
 *
 * 将所有头像统一转换为：
 * - 格式：WebP
 * - 尺寸：400x400 (居中裁剪)
 * - 质量：80
 * - 目标大小：< 20KB
 *
 * 用法：
 *   npx tsx scripts/tools/normalize_avatars.ts --dry-run   # 预览，不执行
 *   npx tsx scripts/tools/normalize_avatars.ts             # 执行转换
 *   npx tsx scripts/tools/normalize_avatars.ts --quiet     # 静默模式
 */

import 'dotenv/config';
import { prisma } from '../../lib/db/prisma';
import sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';

// ============ 配置 ============
const AVATAR_DIR = path.join(process.cwd(), 'public/avatars');
const TARGET_SIZE = 400;  // 400x400
const WEBP_QUALITY = 80;
const BACKUP_DIR = path.join(process.cwd(), 'public/avatars_backup');

interface ProcessResult {
  total: number;
  converted: number;
  skipped: number;
  failed: number;
  savedBytes: number;
}

async function normalizeAvatar(
  filePath: string,
  dryRun: boolean,
  quiet: boolean
): Promise<{ success: boolean; savedBytes: number; error?: string }> {
  const originalSize = fs.statSync(filePath).size;
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath, ext);
  const newPath = path.join(AVATAR_DIR, `${baseName}.webp`);

  // 如果已经是优化过的 webp 且小于 25KB，跳过
  if (ext === '.webp' && originalSize < 25000) {
    return { success: true, savedBytes: 0 };
  }

  try {
    // 读取图片元信息
    const metadata = await sharp(filePath).metadata();

    if (!metadata.width || !metadata.height) {
      return { success: false, savedBytes: 0, error: '无法读取图片尺寸' };
    }

    // 计算裁剪区域（居中正方形裁剪）
    const minDim = Math.min(metadata.width, metadata.height);
    const left = Math.floor((metadata.width - minDim) / 2);
    const top = Math.floor((metadata.height - minDim) / 2);

    if (dryRun) {
      // 预览模式：只计算预估大小
      const testBuffer = await sharp(filePath)
        .extract({ left, top, width: minDim, height: minDim })
        .resize(TARGET_SIZE, TARGET_SIZE)
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();

      const savedBytes = originalSize - testBuffer.length;
      if (!quiet) {
        console.log(`  [预览] ${path.basename(filePath)}: ${(originalSize/1024).toFixed(1)}KB -> ${(testBuffer.length/1024).toFixed(1)}KB (节省 ${(savedBytes/1024).toFixed(1)}KB)`);
      }
      return { success: true, savedBytes };
    }

    // 实际转换
    const outputBuffer = await sharp(filePath)
      .extract({ left, top, width: minDim, height: minDim })
      .resize(TARGET_SIZE, TARGET_SIZE)
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();

    // 备份原文件
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    fs.copyFileSync(filePath, path.join(BACKUP_DIR, path.basename(filePath)));

    // 写入新文件
    fs.writeFileSync(newPath, outputBuffer);

    // 如果原文件不是 webp，删除原文件
    if (ext !== '.webp' && filePath !== newPath) {
      fs.unlinkSync(filePath);
    }

    const savedBytes = originalSize - outputBuffer.length;
    if (!quiet) {
      console.log(`  ✓ ${path.basename(filePath)} -> ${baseName}.webp: ${(originalSize/1024).toFixed(1)}KB -> ${(outputBuffer.length/1024).toFixed(1)}KB`);
    }

    return { success: true, savedBytes };
  } catch (error) {
    return { success: false, savedBytes: 0, error: String(error) };
  }
}

async function updateDatabaseUrls(dryRun: boolean, quiet: boolean): Promise<number> {
  // 获取所有有本地头像的人物
  const people = await prisma.people.findMany({
    where: {
      avatarUrl: { startsWith: '/avatars/' }
    },
    select: { id: true, name: true, avatarUrl: true }
  });

  let updated = 0;

  for (const person of people) {
    if (!person.avatarUrl) continue;

    const ext = path.extname(person.avatarUrl).toLowerCase();
    if (ext === '.webp') continue;  // 已经是 webp

    const baseName = path.basename(person.avatarUrl, ext);
    const newUrl = `/avatars/${baseName}.webp`;
    const newFilePath = path.join(AVATAR_DIR, `${baseName}.webp`);

    // 检查新文件是否存在
    if (!fs.existsSync(newFilePath)) continue;

    if (dryRun) {
      if (!quiet) {
        console.log(`  [预览] ${person.name}: ${person.avatarUrl} -> ${newUrl}`);
      }
      updated++;
    } else {
      await prisma.people.update({
        where: { id: person.id },
        data: { avatarUrl: newUrl }
      });
      updated++;
    }
  }

  return updated;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const quiet = args.includes('--quiet');

  console.log('=== 头像标准化工具 ===');
  console.log(`模式: ${dryRun ? '预览（不执行）' : '执行转换'}`);
  console.log(`目标规格: ${TARGET_SIZE}x${TARGET_SIZE} WebP, 质量=${WEBP_QUALITY}`);
  console.log('');

  // 获取所有头像文件
  const files = fs.readdirSync(AVATAR_DIR)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .map(f => path.join(AVATAR_DIR, f));

  console.log(`找到 ${files.length} 个头像文件`);
  console.log('');

  // 统计原始大小
  const originalTotalSize = files.reduce((sum, f) => sum + fs.statSync(f).size, 0);
  console.log(`原始总大小: ${(originalTotalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log('');

  // 处理每个文件
  const result: ProcessResult = {
    total: files.length,
    converted: 0,
    skipped: 0,
    failed: 0,
    savedBytes: 0
  };

  console.log('处理文件:');
  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    // 进度显示
    if (quiet && i % 50 === 0) {
      console.log(`进度: ${i}/${files.length}`);
    }

    const res = await normalizeAvatar(file, dryRun, quiet);

    if (res.success) {
      if (res.savedBytes > 0) {
        result.converted++;
        result.savedBytes += res.savedBytes;
      } else {
        result.skipped++;
      }
    } else {
      result.failed++;
      if (!quiet) {
        console.log(`  ✗ ${path.basename(file)}: ${res.error}`);
      }
    }
  }

  console.log('');
  console.log('=== 文件处理结果 ===');
  console.log(`总文件: ${result.total}`);
  console.log(`已转换: ${result.converted}`);
  console.log(`已跳过: ${result.skipped}`);
  console.log(`失败: ${result.failed}`);
  console.log(`节省空间: ${(result.savedBytes / 1024 / 1024).toFixed(2)} MB`);

  // 更新数据库
  console.log('');
  console.log('更新数据库 URL...');
  const dbUpdated = await updateDatabaseUrls(dryRun, quiet);
  console.log(`数据库更新: ${dbUpdated} 条记录`);

  // 最终统计
  if (!dryRun) {
    const newFiles = fs.readdirSync(AVATAR_DIR).filter(f => /\.webp$/i.test(f));
    const newTotalSize = newFiles.reduce((sum, f) =>
      sum + fs.statSync(path.join(AVATAR_DIR, f)).size, 0);

    console.log('');
    console.log('=== 最终统计 ===');
    console.log(`文件数: ${newFiles.length}`);
    console.log(`总大小: ${(newTotalSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`压缩率: ${((1 - newTotalSize / originalTotalSize) * 100).toFixed(1)}%`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
