/**
 * 根据审核报告清理低分和非中英文数据
 *
 * 用法: npx tsx scripts/audit/cleanup_low_score_items.ts
 */

import 'dotenv/config';
import { prisma } from '../../lib/db/prisma';
import * as fs from 'fs';
import * as path from 'path';

// 检测是否为中文或英文标题
function isChineseOrEnglish(text: string): boolean {
  // 移除特殊字符和数字
  const cleaned = text.replace(/[0-9\s\p{P}]/gu, '');
  if (cleaned.length === 0) return false;

  let chineseCount = 0;
  let englishCount = 0;
  let otherCount = 0;

  for (const char of cleaned) {
    const code = char.charCodeAt(0);
    // 中文字符范围
    if (code >= 0x4E00 && code <= 0x9FFF) {
      chineseCount++;
    }
    // 英文字母
    else if ((code >= 0x41 && code <= 0x5A) || (code >= 0x61 && code <= 0x7A)) {
      englishCount++;
    }
    // 其他字符（日韩泰越阿拉伯等）
    else {
      otherCount++;
    }
  }

  const total = chineseCount + englishCount + otherCount;
  if (total === 0) return false;

  // 中英文字符占比超过 70% 认为是中英文内容
  const chineseEnglishRatio = (chineseCount + englishCount) / total;
  return chineseEnglishRatio >= 0.7;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

async function main() {
  const inputFile = 'audit_report_2026-01-12T16-51-17_full.csv';
  const inputPath = path.join(process.cwd(), 'exports', inputFile);

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ 文件不存在: ${inputPath}`);
    process.exit(1);
  }

  console.log('🧹 清理低分和非中英文数据\n');

  // 读取 CSV
  const content = fs.readFileSync(inputPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  const headerLine = lines[0].replace(/^\uFEFF/, '');
  const headers = parseCsvLine(headerLine);

  // 解析数据
  interface AuditRow {
    personName: string;
    sourceType: string;
    title: string;
    url: string;
    score: string;
    reason: string;
    itemId: string;
  }

  const rows: AuditRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || '';
    });
    rows.push(row as unknown as AuditRow);
  }

  console.log(`📋 读取 ${rows.length} 条记录\n`);

  // 分类待删除数据
  const toDeleteScore12: AuditRow[] = [];  // 评分 1-2 的
  const toDeleteNonChEn: AuditRow[] = [];  // 非中英文 YouTube

  for (const row of rows) {
    const score = parseInt(row.score) || 0;

    // 评分 1-2 的直接删除
    if (score <= 2) {
      toDeleteScore12.push(row);
      continue;
    }

    // YouTube 非中英文标题
    if (row.sourceType === 'youtube' && !isChineseOrEnglish(row.title)) {
      toDeleteNonChEn.push(row);
    }
  }

  console.log(`📊 统计:`);
  console.log(`  评分 1-2 分: ${toDeleteScore12.length} 条`);
  console.log(`  非中英文 YouTube: ${toDeleteNonChEn.length} 条`);

  // 合并去重
  const allToDelete = new Map<string, AuditRow>();
  for (const row of [...toDeleteScore12, ...toDeleteNonChEn]) {
    allToDelete.set(row.itemId, row);
  }

  console.log(`  去重后总计: ${allToDelete.size} 条\n`);

  // 显示非中英文的例子
  if (toDeleteNonChEn.length > 0) {
    console.log(`📝 非中英文 YouTube 示例:`);
    toDeleteNonChEn.slice(0, 10).forEach(r => {
      console.log(`  - [${r.personName}] ${r.title.slice(0, 50)}...`);
    });
    if (toDeleteNonChEn.length > 10) {
      console.log(`  ... 还有 ${toDeleteNonChEn.length - 10} 条\n`);
    }
  }

  // 执行删除
  console.log('\n🗑️ 开始删除...');
  let deletedCount = 0;
  let notFoundCount = 0;

  for (const [itemId, row] of allToDelete) {
    try {
      await prisma.rawPoolItem.delete({
        where: { id: itemId }
      });
      deletedCount++;
    } catch (error: any) {
      if (error.code === 'P2025') {
        notFoundCount++;
      } else {
        console.error(`  ❌ 删除失败 [${row.personName}]: ${error.message}`);
      }
    }
  }

  console.log(`\n✅ 清理完成`);
  console.log(`  删除成功: ${deletedCount}`);
  console.log(`  已不存在: ${notFoundCount}`);

  // 更新报告文件 - 移除已删除的记录
  console.log('\n📄 更新审核报告...');

  const deletedIds = new Set(allToDelete.keys());
  const remainingRows = rows.filter(r => !deletedIds.has(r.itemId));

  // 更新完整报告
  const fullHeader = headers.join(',');
  const fullRows = remainingRows.map(r =>
    headers.map(h => {
      const val = (r as any)[h] || '';
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',')
  );
  const fullCsvContent = '\uFEFF' + [fullHeader, ...fullRows].join('\n');
  fs.writeFileSync(inputPath, fullCsvContent);
  console.log(`  更新: ${inputFile} (${remainingRows.length} 条)`);

  // 更新可疑记录报告
  const suspiciousFile = inputFile.replace('_full.csv', '.csv');
  const suspiciousPath = path.join(process.cwd(), 'exports', suspiciousFile);
  const suspiciousRows = remainingRows.filter(r => parseInt(r.score) <= 3);
  const suspiciousCsvContent = '\uFEFF' + [fullHeader, ...suspiciousRows.map(r =>
    headers.map(h => {
      const val = (r as any)[h] || '';
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(',')
  )].join('\n');
  fs.writeFileSync(suspiciousPath, suspiciousCsvContent);
  console.log(`  更新: ${suspiciousFile} (${suspiciousRows.length} 条)`);

  // 输出最终统计
  const scoreStats: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  remainingRows.forEach(r => {
    const s = parseInt(r.score) || 0;
    if (s >= 1 && s <= 5) scoreStats[s]++;
  });

  console.log('\n📊 剩余记录评分分布:');
  console.log(`  5分 (确定相关): ${scoreStats[5]}`);
  console.log(`  4分 (很可能相关): ${scoreStats[4]}`);
  console.log(`  3分 (待确认): ${scoreStats[3]}`);
  console.log(`  2分 (很可能不相关): ${scoreStats[2]}`);
  console.log(`  1分 (确定不相关): ${scoreStats[1]}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
