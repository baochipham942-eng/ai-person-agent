/**
 * 应用审核结果，清理不相关的 RawPoolItem 数据
 *
 * 用法: npx tsx scripts/audit/apply_audit_cleanup.ts --input=audit_report_xxx.csv
 *
 * 参数:
 *   --input=FILE    审核报告文件名（必需）
 *   --dry-run       模拟运行，不实际删除
 *   --quiet         静默模式
 */

import 'dotenv/config';
import { prisma } from '../../lib/db/prisma';
import * as fs from 'fs';
import * as path from 'path';

interface AuditRow {
  personName: string;
  personOrg: string;
  sourceType: string;
  title: string;
  url: string;
  publishedAt: string;
  score: string;
  reason: string;
  isPersonContent: string;
  action: string;
  personId: string;
  itemId: string;
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
  const args = process.argv.slice(2);

  const inputArg = args.find(a => a.startsWith('--input='));
  const dryRun = args.includes('--dry-run');
  const quiet = args.includes('--quiet');

  if (!inputArg) {
    console.error('❌ 请指定输入文件: --input=audit_report_xxx.csv');
    process.exit(1);
  }

  const inputFile = inputArg.split('=')[1];
  const inputPath = path.join(process.cwd(), 'exports', inputFile);

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ 文件不存在: ${inputPath}`);
    process.exit(1);
  }

  console.log('🧹 应用审核结果清理数据\n');
  console.log(`输入文件: ${inputFile}`);
  console.log(`模式: ${dryRun ? '模拟运行 (不实际删除)' : '正式运行'}\n`);

  // 读取 CSV
  const content = fs.readFileSync(inputPath, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());

  if (lines.length < 2) {
    console.log('文件为空或只有表头');
    return;
  }

  // 解析表头
  const headerLine = lines[0].replace(/^\uFEFF/, ''); // 移除 BOM
  const headers = parseCsvLine(headerLine);

  // 解析数据行
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

  // 统计
  const toDelete = rows.filter(r => r.action?.toLowerCase() === 'delete');
  const toKeep = rows.filter(r => r.action?.toLowerCase() === 'keep');
  const noAction = rows.filter(r => !r.action || !['delete', 'keep'].includes(r.action.toLowerCase()));

  console.log(`待删除: ${toDelete.length}`);
  console.log(`保留: ${toKeep.length}`);
  console.log(`未标记: ${noAction.length}`);

  if (toDelete.length === 0) {
    console.log('\n没有需要删除的记录');
    return;
  }

  // 按人物分组显示
  const byPerson: Record<string, AuditRow[]> = {};
  toDelete.forEach(r => {
    if (!byPerson[r.personName]) byPerson[r.personName] = [];
    byPerson[r.personName].push(r);
  });

  console.log('\n📝 待删除记录:');
  for (const [name, items] of Object.entries(byPerson)) {
    console.log(`\n  ${name} (${items.length} 条):`);
    items.slice(0, 5).forEach(item => {
      console.log(`    - [${item.sourceType}] ${item.title.slice(0, 40)}...`);
    });
    if (items.length > 5) {
      console.log(`    ... 还有 ${items.length - 5} 条`);
    }
  }

  if (dryRun) {
    console.log('\n⚠️ 模拟运行，未执行删除');
    console.log('移除 --dry-run 参数以正式删除');
    return;
  }

  // 执行删除
  console.log('\n🗑️ 开始删除...');
  let deletedCount = 0;
  let failedCount = 0;

  for (const row of toDelete) {
    try {
      await prisma.rawPoolItem.delete({
        where: { id: row.itemId }
      });
      deletedCount++;

      if (!quiet) {
        console.log(`  ✓ 删除: ${row.title.slice(0, 40)}...`);
      }
    } catch (error: any) {
      if (error.code === 'P2025') {
        // 记录已不存在，跳过
        if (!quiet) {
          console.log(`  ⏭️ 已不存在: ${row.title.slice(0, 40)}...`);
        }
      } else {
        failedCount++;
        console.error(`  ❌ 删除失败: ${row.title.slice(0, 40)}... - ${error.message}`);
      }
    }
  }

  console.log(`\n✅ 清理完成`);
  console.log(`  删除成功: ${deletedCount}`);
  console.log(`  删除失败: ${failedCount}`);

  // 保存执行日志
  const logFile = inputFile.replace('.csv', '_cleanup_log.txt');
  const logPath = path.join(process.cwd(), 'exports', logFile);
  const logContent = `清理执行日志
时间: ${new Date().toISOString()}
输入文件: ${inputFile}
待删除: ${toDelete.length}
删除成功: ${deletedCount}
删除失败: ${failedCount}

删除记录:
${toDelete.map(r => `- [${r.sourceType}] ${r.personName}: ${r.title}`).join('\n')}
`;
  fs.writeFileSync(logPath, logContent);
  console.log(`\n📄 执行日志: ${logPath}`);
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
