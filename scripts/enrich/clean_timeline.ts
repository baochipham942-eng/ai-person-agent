/**
 * 时光轴数据清理脚本
 *
 * 功能：
 * 1. 使用 validateTimeline 检查每个人的时光轴数据
 * 2. 删除明显错误的记录（非AI领域、时间线严重冲突）
 * 3. 标记可疑数据供人工审核
 *
 * 使用: npx tsx scripts/enrich/clean_timeline.ts [--dry-run] [--person-id=xxx]
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import ws from 'ws';
import { validateTimeline, TimelineEntry } from '../../lib/utils/identity';

neonConfig.webSocketConstructor = ws;

const connectionString = process.env.DATABASE_URL!;

function getClient() {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    return new PrismaClient({ adapter });
}

// 严重问题关键词 - 这些记录需要删除
const SEVERE_ISSUES_PATTERNS = [
    /非AI领域机构/,
    /起始年份过早/,
    /起始年份在未来/,
    /时间倒序/,
];

// 需要删除的负面领域机构关键词
const DELETE_ORG_KEYWORDS = [
    // 农业/植物学（除非明确是 AI+农业）
    'botanical', '植物园', 'agricultural research', '农业研究院',
    // 体育
    'football club', 'basketball team', 'soccer', 'nba', 'nfl', 'olympics',
    // 娱乐
    'orchestra', '交响乐团', 'theater company', '剧团', 'film studio', '影视公司',
    // 历史
    'dynasty', '王朝', 'ancient',
];

// 需要删除的负面职位关键词
const DELETE_ROLE_KEYWORDS = [
    'actor', 'actress', '演员', 'singer', '歌手',
    'athlete', '运动员', 'coach', '教练',
    'conductor', '指挥', '艺术总监',
];

interface CleanupStats {
    totalPeople: number;
    peopleWithIssues: number;
    rolesDeleted: number;
    rolesFlagged: number;
}

async function cleanTimeline(dryRun: boolean = true, targetPersonId?: string): Promise<CleanupStats> {
    const db = getClient();
    const stats: CleanupStats = {
        totalPeople: 0,
        peopleWithIssues: 0,
        rolesDeleted: 0,
        rolesFlagged: 0,
    };

    try {
        // 获取人物列表
        const whereClause = targetPersonId ? { id: targetPersonId } : {};
        const people = await db.people.findMany({
            where: {
                ...whereClause,
                roles: { some: {} },
            },
            include: {
                roles: {
                    include: { organization: true },
                    orderBy: { startDate: 'desc' },
                },
            },
        });

        stats.totalPeople = people.length;
        console.log(`\n=== 时光轴数据清理 ${dryRun ? '(DRY RUN)' : ''} ===`);
        console.log(`共 ${people.length} 人需要检查\n`);

        for (const person of people) {
            // 转换为 TimelineEntry 格式
            const entries: TimelineEntry[] = person.roles.map(r => ({
                organization: r.organization.name,
                role: r.role,
                startDate: r.startDate,
                endDate: r.endDate,
                source: r.source,
            }));

            // 验证时间线
            const validation = validateTimeline(entries);

            if (!validation.isValid || validation.score < 0.7) {
                stats.peopleWithIssues++;
                console.log(`\n[${person.name}] 置信度: ${validation.score.toFixed(2)}`);

                // 检查每个角色是否需要删除
                for (const role of person.roles) {
                    const orgLower = role.organization.name.toLowerCase();
                    const roleLower = role.role.toLowerCase();

                    // 检查是否包含需要删除的关键词
                    const shouldDeleteOrg = DELETE_ORG_KEYWORDS.some(kw => orgLower.includes(kw));
                    const shouldDeleteRole = DELETE_ROLE_KEYWORDS.some(kw => roleLower.includes(kw));

                    // 检查年份问题
                    const startYear = role.startDate?.getFullYear();
                    const endYear = role.endDate?.getFullYear();
                    const currentYear = new Date().getFullYear();
                    const hasTimeIssue = (startYear && startYear < 1950) ||
                        (startYear && startYear > currentYear + 1) ||
                        (endYear && startYear && endYear < startYear);

                    if (shouldDeleteOrg || shouldDeleteRole || hasTimeIssue) {
                        stats.rolesDeleted++;
                        const reason = shouldDeleteOrg ? '非AI领域机构' :
                            shouldDeleteRole ? '非AI领域职位' : '时间线错误';
                        console.log(`  ❌ 删除: ${role.organization.name} - ${role.role} (${reason})`);

                        if (!dryRun) {
                            await db.personRole.delete({ where: { id: role.id } });
                        }
                    } else if (validation.issues.some(issue =>
                        issue.includes(role.organization.name) || issue.includes(role.role)
                    )) {
                        stats.rolesFlagged++;
                        console.log(`  ⚠️ 标记: ${role.organization.name} - ${role.role}`);
                    }
                }

                // 输出问题详情
                if (validation.issues.length > 0) {
                    console.log(`  问题:`);
                    validation.issues.slice(0, 5).forEach(issue => {
                        console.log(`    - ${issue}`);
                    });
                }
            }
        }

        // 输出统计
        console.log('\n========================================');
        console.log('=== 清理统计 ===');
        console.log('========================================');
        console.log(`总人数: ${stats.totalPeople}`);
        console.log(`有问题人数: ${stats.peopleWithIssues}`);
        console.log(`删除记录数: ${stats.rolesDeleted}`);
        console.log(`标记记录数: ${stats.rolesFlagged}`);

        if (dryRun) {
            console.log('\n⚠️ 这是 DRY RUN 模式，没有实际删除数据');
            console.log('运行 `npx tsx scripts/enrich/clean_timeline.ts` 去掉 --dry-run 执行实际删除');
        }

        return stats;
    } finally {
        await db.$disconnect();
    }
}

// 解析命令行参数
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || !args.some(a => a === '--execute');
const personIdArg = args.find(a => a.startsWith('--person-id='));
const personId = personIdArg ? personIdArg.split('=')[1] : undefined;

if (!args.includes('--dry-run') && !args.includes('--execute')) {
    console.log('默认 DRY RUN 模式。使用 --execute 执行实际删除。');
}

cleanTimeline(dryRun, personId)
    .then(() => process.exit(0))
    .catch(e => {
        console.error('Error:', e);
        process.exit(1);
    });
